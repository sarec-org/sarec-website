/**
 * 1.3.1 A4：合并重复档案（工作台，助理确认后才合并，可撤销）。
 *
 * - 疑似重复只用来提示：同一个手机号（含未验证、历史号）、同一个邮箱、姓名相同。助理点“是同一个人”才合并，
 *   点“不是”以后不再提示。
 * - 合并 = 把“被合并档案”的报名、签到、缴费、积分明细、资料、名片……搬到“保留档案”，被合并档案留着，
 *   merged_into 指向保留档案（它的微信登录、手机号登录以后都进保留档案）。
 * - 同一场两边都有报名：保留档案那份留着（另一边签到过就把签到补到保留档案），另一份留在原档案不搬。
 * - 重复积分不相加：同一来源（同一场签到、同一道题）两边都得过的，给多出来的那条记一笔冲销。
 * - 合并不会带来管理员权限：工作人员身份不搬；有工作人员身份的档案不能被合并掉。
 * - 撤销：原样搬回，删掉合并时加的冲销，被合并档案恢复独立。
 */
import { withTransaction, getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import type { Staff } from '@/lib/crm/auth';
import { actor, audit } from '@/lib/crm/staff';

type Db = { query: ReturnType<typeof getPool>['query'] };

// 不搬的表：会话按 merged_into 自动跟到主档案；验证码、扫码登录、发送记录是流水；工作人员身份不搬
const SKIP = new Set(['sessions', 'qr_logins', 'phone_verify_sends', 'contact_merges', 'contact_not_duplicates', 'contacts', 'staff_roles', 'crm_audit_log', 'admin_audit_log']);

async function fkColumns(db: Db): Promise<{ table: string; column: string }[]> {
  const { rows } = await db.query<{ table: string; column: string }>(
    `SELECT kcu.table_name AS table, kcu.column_name AS column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'contacts' AND ccu.column_name = 'id' AND tc.table_schema = 'public'
      ORDER BY 1, 2`
  );
  const { rows: withId } = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'id'`
  );
  const hasId = new Set(withId.map((r) => r.table_name));
  return rows.filter((r) => !SKIP.has(r.table) && hasId.has(r.table));
}

const ident = (s: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error('bad identifier');
  return `"${s}"`;
};

export async function mergeContacts(s: Staff, keptId: string, mergedId: string, reason?: string) {
  if (keptId === mergedId) throw new CrmError('bad_request', '选的是同一份档案');
  return withTransaction(async (db) => {
    const { rows: two } = await db.query<{ id: string; merged_into: string | null; name: string }>(
      `SELECT id, merged_into, name FROM contacts WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [[keptId, mergedId]]
    );
    if (two.length !== 2) throw new CrmError('not_found', '找不到这两份档案');
    if (two.some((c) => c.merged_into)) throw new CrmError('conflict', '其中一份档案已经合并过了，请刷新');
    const { rows: st } = await db.query(
      `SELECT 1 FROM staff_roles s JOIN contacts c ON (s.mp_contact_id = c.id OR (s.email = c.email AND c.email_verified_at IS NOT NULL)) WHERE c.id = $1`,
      [mergedId]
    );
    if (st[0]) throw new CrmError('forbidden', '这份档案是工作人员账号，不能被合并掉。请把它选为“保留”的那一份，或先在团队页停用。');

    const moved: Record<string, { id: string; col: string }[]> = {};
    const added: Record<string, string[]> = { points_ledger: [] };
    const notes: string[] = [];

    for (const { table, column } of await fkColumns(db)) {
      const T = ident(table);
      const C = ident(column);
      const { rows } = await db.query<{ id: string }>(`SELECT id::text FROM ${T} WHERE ${C} = $1`, [mergedId]);
      for (const r of rows) {
        await db.query('SAVEPOINT mv');
        try {
          await db.query(`UPDATE ${T} SET ${C} = $1 WHERE id::text = $2`, [keptId, r.id]);
          await db.query('RELEASE SAVEPOINT mv');
          (moved[table] ??= []).push({ id: r.id, col: column });
        } catch {
          await db.query('ROLLBACK TO SAVEPOINT mv');
          // 撞了唯一约束（同一场两边都有报名、当前联系方式等）：留在原档案；报名的签到补到保留档案
          if (table === 'registrations' && column === 'contact_id') {
            const { rows: b } = await db.query<{ event_id: string; arrival_status: string; checked_in_at: Date | null }>(
              `SELECT event_id, arrival_status, checked_in_at FROM registrations WHERE id::text = $1`,
              [r.id]
            );
            if (b[0]?.arrival_status === 'checked_in') {
              await db.query(
                `UPDATE registrations SET arrival_status = 'checked_in', checked_in_at = coalesce(checked_in_at, $3), arrived_at = coalesce(arrived_at, $3), updated_at = now()
                  WHERE event_id = $1 AND contact_id = $2 AND arrival_status <> 'checked_in'`,
                [b[0].event_id, keptId, b[0].checked_in_at]
              );
            }
            notes.push(`同一场两边都有报名：保留档案的那份留着（event ${b[0]?.event_id}）`);
          }
        }
      }
    }

    // 重复积分不相加：同一来源（把两份档案的编号去掉后 event_key 相同，例如同一场签到、同一道题）多出来的记冲销
    const { rows: dups } = await db.query<{ id: string; points: number; reason: string | null }>(
      `WITH k AS (
         SELECT id, points, reason, created_at, replace(replace(event_key, $2::text, '*'), $1::text, '*') AS src
           FROM points_ledger WHERE contact_id = $1::uuid AND points > 0 AND reverses_id IS NULL)
       SELECT id, points, reason FROM (SELECT *, row_number() OVER (PARTITION BY src ORDER BY created_at) AS n FROM k) x
        WHERE n > 1 AND NOT EXISTS (SELECT 1 FROM points_ledger p WHERE p.reverses_id = x.id)`,
      [keptId, mergedId]
    );
    for (const d of dups) {
      const { rows: ins } = await db.query<{ id: string }>(
        `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, rule_version, reverses_id, created_by)
         VALUES ($1, 'adjust', $2, $3, $4, 'v1.3.1', $5, $6) RETURNING id`,
        [keptId, -d.points, `merge-dup:${d.id}`, `合并档案：重复积分不相加（${d.reason ?? ''}）`, d.id, actor(s)]
      );
      added.points_ledger.push(ins[0].id);
    }

    // 以前挂到被合并档案下的微信登录，改挂到保留档案
    const { rows: rep } = await db.query<{ id: string }>(`UPDATE contacts SET merged_into = $1 WHERE merged_into = $2 RETURNING id`, [keptId, mergedId]);
    await db.query(`UPDATE contacts SET merged_into = $1, updated_at = now() WHERE id = $2`, [keptId, mergedId]);
    const { rows: m } = await db.query<{ id: string }>(
      `INSERT INTO contact_merges (kept_id, merged_id, moved, added, reason, merged_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [keptId, mergedId, JSON.stringify({ ...moved, _repointed: rep.map((x) => ({ id: x.id, col: 'merged_into' })) }), JSON.stringify(added), reason ?? null, actor(s)]
    );
    await audit(db, s, 'merge_contacts', 'contact', keptId, { after: { merged: mergedId, mergeId: m[0].id, notes }, reason: reason ?? null });
    const count = Object.values(moved).reduce((a, v) => a + v.length, 0);
    return { mergeId: m[0].id, movedRows: count, pointsReversed: dups.length, notes };
  });
}

export async function undoMerge(s: Staff, mergeId: string) {
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ kept_id: string; merged_id: string; moved: Record<string, { id: string; col: string }[]>; added: Record<string, string[]>; undone_at: Date | null }>(
      `SELECT kept_id, merged_id, moved, added, undone_at FROM contact_merges WHERE id = $1 FOR UPDATE`,
      [mergeId]
    );
    const m = rows[0];
    if (!m) throw new CrmError('not_found', '找不到这次合并');
    if (m.undone_at) throw new CrmError('conflict', '这次合并已经撤销过了');
    for (const id of m.added.points_ledger ?? []) await db.query(`DELETE FROM points_ledger WHERE id = $1`, [id]);
    for (const [table, list] of Object.entries(m.moved)) {
      if (table === '_repointed') continue;
      for (const r of list) await db.query(`UPDATE ${ident(table)} SET ${ident(r.col)} = $1 WHERE id::text = $2`, [m.merged_id, r.id]);
    }
    for (const r of m.moved._repointed ?? []) await db.query(`UPDATE contacts SET merged_into = $1 WHERE id = $2`, [m.merged_id, r.id]);
    await db.query(`UPDATE contacts SET merged_into = NULL, updated_at = now() WHERE id = $1`, [m.merged_id]);
    await db.query(`UPDATE contact_merges SET undone_at = now(), undone_by = $2 WHERE id = $1`, [mergeId, actor(s)]);
    await audit(db, s, 'undo_merge_contacts', 'contact', m.kept_id, { after: { merged: m.merged_id, mergeId } });
    return { ok: true };
  });
}

export async function markNotDuplicate(s: Staff, a: string, b: string) {
  const [x, y] = [a, b].sort();
  await getPool().query(`INSERT INTO contact_not_duplicates (a_id, b_id, marked_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [x, y, actor(s)]);
  return { ok: true };
}

export type DupPair = {
  a: { id: string; memberNo: number; name: string; phone: string | null; email: string | null; regs: number; createdAt: Date };
  b: { id: string; memberNo: number; name: string; phone: string | null; email: string | null; regs: number; createdAt: Date };
  why: string[];
};

/** 疑似重复：同手机号（含未验证、历史）、同邮箱、同名（去空格、不分大小写）。 */
export async function duplicateSuggestions(limit = 60): Promise<DupPair[]> {
  const { rows } = await getPool().query<{ a: string; b: string; why: string[] }>(
    `WITH live AS (SELECT id, NULLIF(name, '微信用户') AS name, phone_e164, lower(email) AS email FROM contacts WHERE merged_into IS NULL),
     keys AS (
       SELECT id, 'phone:' || phone_e164 AS k, '手机号相同' AS why FROM live WHERE phone_e164 IS NOT NULL
       UNION SELECT m.contact_id, 'phone:' || m.value, '手机号相同（含未验证 / 以前用过的号）' FROM contact_methods m JOIN live l ON l.id = m.contact_id WHERE m.kind = 'phone'
       UNION SELECT id, 'email:' || email, '邮箱相同' FROM live WHERE email IS NOT NULL
       UNION SELECT m.contact_id, 'email:' || lower(m.value), '邮箱相同（含未确认）' FROM contact_methods m JOIN live l ON l.id = m.contact_id WHERE m.kind = 'email'
       UNION SELECT id, 'name:' || lower(regexp_replace(name, '\\s+', '', 'g')), '姓名相同' FROM live WHERE name IS NOT NULL AND length(name) >= 2
     )
     SELECT x.id AS a, y.id AS b, array_agg(DISTINCT x.why) AS why
       FROM keys x JOIN keys y ON x.k = y.k AND x.id < y.id
      WHERE NOT EXISTS (SELECT 1 FROM contact_not_duplicates n WHERE n.a_id = x.id AND n.b_id = y.id)
      GROUP BY 1, 2
      ORDER BY bool_or(x.k LIKE 'phone:%') DESC, bool_or(x.k LIKE 'email:%') DESC, count(*) DESC
      LIMIT $1`,
    [limit]
  );
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.flatMap((r) => [r.a, r.b])));
  const { rows: info } = await getPool().query<{ id: string; member_no: number; name: string; phone_e164: string | null; email: string | null; regs: number; created_at: Date }>(
    `SELECT c.id, c.member_no::int, c.name, c.phone_e164, c.email, c.created_at,
            (SELECT count(*)::int FROM registrations r WHERE r.contact_id = c.id AND r.status <> 'cancelled') AS regs
       FROM contacts c WHERE c.id = ANY($1::uuid[])`,
    [ids]
  );
  const by = new Map(info.map((c) => [c.id, { id: c.id, memberNo: c.member_no, name: c.name, phone: c.phone_e164, email: c.email, regs: c.regs, createdAt: c.created_at }]));
  return rows.map((r) => ({ a: by.get(r.a)!, b: by.get(r.b)!, why: r.why }));
}

export async function recentMerges(limit = 30) {
  const { rows } = await getPool().query(
    `SELECT m.id, m.kept_id, m.merged_id, m.merged_by, m.created_at, m.undone_at, m.undone_by, m.reason,
            k.name AS kept_name, k.member_no::int AS kept_no, d.name AS merged_name, d.member_no::int AS merged_no
       FROM contact_merges m JOIN contacts k ON k.id = m.kept_id JOIN contacts d ON d.id = m.merged_id
      ORDER BY m.created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * 补登记到场（工作台）：实际来了但系统没记上的人（例如 11/6），按手机号找档案，找不到就新建，补一份报名并记到场。
 * 活动已结束也能补；每次补登记留操作记录（谁、什么时候、备注）。签到积分照常记一次。
 */
export async function backfillAttendance(
  s: Staff,
  eventId: string,
  b: { contactId?: string; name?: string; phone?: string; cc?: string; note?: string }
) {
  const { normalizePhone, CHECKIN_POINTS } = await import('@/lib/crm/events');
  const { setMethod } = await import('@/lib/crm/contactInfo');
  return withTransaction(async (db) => {
    const { rows: ev } = await db.query<{ id: string; slug: string; title: string }>(`SELECT id, slug, title FROM events WHERE id = $1`, [eventId]);
    if (!ev[0]) throw new CrmError('not_found', '找不到这场活动');
    let contactId = b.contactId ?? null;
    let created = false;
    if (contactId) {
      const { rows } = await db.query<{ id: string }>(`SELECT coalesce(merged_into, id) AS id FROM contacts WHERE id = $1`, [contactId]);
      if (!rows[0]) throw new CrmError('not_found', '找不到这个人');
      contactId = rows[0].id;
    } else {
      const name = String(b.name ?? '').trim().slice(0, 60);
      if (!name) throw new CrmError('bad_request', '请填写姓名');
      const phone = b.phone ? normalizePhone(String(b.phone), b.cc === '+86' ? '+86' : '+1') : null;
      if (b.phone && !phone) throw new CrmError('bad_phone', '手机号格式不对，美国号码 10 位，中国号码 11 位');
      if (phone) {
        const { rows } = await db.query<{ id: string }>(
          `SELECT coalesce(c.merged_into, c.id) AS id FROM contacts c
            WHERE c.phone_e164 = $1 OR EXISTS (SELECT 1 FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.value = $1)
            ORDER BY (c.phone_verified_at IS NOT NULL) DESC, c.created_at LIMIT 1`,
          [phone]
        );
        contactId = rows[0]?.id ?? null;
      }
      if (!contactId) {
        if (!phone) throw new CrmError('bad_request', '新登记的人请填手机号（以后好认出来）');
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO contacts (name, phone_e164, acquisition_source) VALUES ($1, $2, 'staff_backfill') RETURNING id`,
          [name, phone]
        );
        contactId = rows[0].id;
        created = true;
        await setMethod(db, contactId, 'phone', phone, 'staff');
      }
    }
    const { rows: reg } = await db.query<{ id: string; arrival_status: string }>(
      `INSERT INTO registrations (event_id, contact_id, status, source, arrival_status, checked_in_at, arrived_at, checkin_method, checkin_by)
       VALUES ($1, $2, 'registered', 'staff', 'checked_in', now(), now(), 'staff', $3)
       ON CONFLICT (event_id, contact_id) DO UPDATE SET
         status = 'registered',
         arrival_status = 'checked_in',
         checked_in_at = coalesce(registrations.checked_in_at, now()),
         arrived_at = coalesce(registrations.arrived_at, now()),
         checkin_method = coalesce(registrations.checkin_method, 'staff'),
         checkin_by = coalesce(registrations.checkin_by, $3),
         updated_at = now()
       RETURNING id, arrival_status`,
      [eventId, contactId, actor(s)]
    );
    await db.query(
      `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, related_id, rule_version, created_by)
       VALUES ($1, 'checkin', $2, $3, '参加活动签到（工作人员补登记）', $4, 'v1.3.1', $5) ON CONFLICT (event_key) DO NOTHING`,
      [contactId, CHECKIN_POINTS, `checkin:${contactId}:${eventId}`, eventId, actor(s)]
    );
    await audit(db, s, 'backfill_attendance', 'contact', contactId, { after: { event: ev[0].slug, registration: reg[0].id, created }, reason: String(b.note ?? '').slice(0, 200) || null });
    return { contactId, created, registrationId: reg[0].id };
  });
}

/** 补登记记录（这场活动谁补的、什么时候、备注）。 */
export async function backfillLog(eventId: string) {
  const { rows } = await getPool().query(
    `SELECT a.created_at, a.actor, a.reason, c.name, c.member_no::int
       FROM crm_audit_log a JOIN contacts c ON c.id::text = a.target_id
      WHERE a.action = 'backfill_attendance' AND a.after_value->>'event' = (SELECT slug FROM events WHERE id = $1)
      ORDER BY a.created_at DESC LIMIT 200`,
    [eventId]
  );
  return rows;
}
