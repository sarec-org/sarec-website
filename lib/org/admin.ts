/**
 * 1.6.0 后台「主办方」：开通主办方（出开通码）、停用 / 恢复、先审后发放行、下架、总开关和接龙开关、「我也要办活动」申请、试用看板、
 * 平台查看名单（只有管理员能看，每次记一笔：谁、何时、为什么）。所有改动记 crm_audit_log。
 */
import QRCode from 'qrcode';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { setSetting } from '@/lib/crm/orders';
import type { Staff } from '@/lib/crm/auth';
import { audit } from '@/lib/crm/staff';
import { orgBindCode, wxConfigured } from '@/lib/crm/wechat';
import { DEMO_ORG_NAME, ORG_QR_PREFIX, chainOn, createCode, randCode, toolOn, whenText, type OrgEvent } from './service';
import { PROMISE_VERSION } from './texts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const who = (s: Staff) => s.name || s.email;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function bindQr(code: string) {
  let qr: string | null = null;
  if (wxConfigured()) qr = await orgBindCode(code).then((b) => `data:image/png;base64,${b.toString('base64')}`).catch(() => null);
  const qrPlain = await QRCode.toDataURL(ORG_QR_PREFIX + code, { margin: 1, width: 300 }).catch(() => null);
  return { qr, qrPlain };
}

export async function overview() {
  const pool = getPool();
  const { rows: orgs } = await pool.query(
    `SELECT o.id, o.name, o.logo_url, o.public_contact, o.staff_note, o.status, o.review_left, o.agreed_at, o.agreed_version, o.suspended_at, o.suspend_reason, o.helps, o.created_at, o.created_by,
            coalesce((to_jsonb(o)->>'is_demo')::boolean, false) AS is_demo,
            (SELECT json_agg(json_build_object('id', c.id, 'name', coalesce(NULLIF(c.name, '微信用户'), '（没填名字）'), 'role', m.role) ORDER BY m.role DESC)
               FROM organizer_members m JOIN contacts c ON c.id = m.contact_id WHERE m.organizer_id = o.id AND m.removed_at IS NULL) AS members,
            (SELECT count(*)::int FROM org_events e WHERE e.organizer_id = o.id AND e.status = 'published') AS events,
            (SELECT k.code FROM organizer_codes k WHERE k.organizer_id = o.id AND k.kind = 'owner' AND k.used_at IS NULL AND k.expires_at > now() ORDER BY k.created_at DESC LIMIT 1) AS open_code
       FROM organizers o ORDER BY o.status = 'suspended', coalesce((to_jsonb(o)->>'is_demo')::boolean, false), o.created_at DESC`
  );
  const { rows: events } = await pool.query<OrgEvent & { org_name: string; people: number }>(
    `SELECT e.*, o.name AS org_name, (SELECT coalesce(sum(party_size), 0)::int FROM org_regs r WHERE r.event_id = e.id AND r.status = 'registered') AS people
       FROM org_events e JOIN organizers o ON o.id = e.organizer_id
      WHERE e.status = 'review' OR e.created_at > now() - interval '60 days' OR e.starts_at > now()
      ORDER BY e.status = 'review' DESC, e.created_at DESC LIMIT 200`
  );
  const { rows: apps } = await pool.query(
    `SELECT a.*, e.title AS from_title FROM org_applications a LEFT JOIN org_events e ON e.id = a.from_event ORDER BY a.status = 'open' DESC, a.created_at DESC LIMIT 100`
  );
  const { rows: g } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM contacts WHERE org_guest_since IS NOT NULL`);
  // 审核用开通码（迁移 0051）：没跑迁移时这里就是空的
  const { rows: reviewCodes } = await pool.query(
    `SELECT k.code, k.expires_at, k.created_at, k.created_by, to_jsonb(k)->>'note' AS note, to_jsonb(k)->>'revoked_at' AS revoked_at,
            coalesce((to_jsonb(k)->>'uses')::int, 0) AS uses, o.name AS org_name
       FROM organizer_codes k JOIN organizers o ON o.id = k.organizer_id WHERE k.kind = 'review' ORDER BY k.created_at DESC LIMIT 20`
  );
  return {
    reviewCodes,
    switches: { tool: await toolOn(), chain: await chainOn() },
    organizers: orgs,
    events: events.map((e) => ({
      id: e.id, code: e.code, organizer: e.org_name, organizerId: e.organizer_id, title: e.title, mode: e.mode, when: whenText(e), status: e.status,
      secStatus: e.sec_status, description: e.description, locationName: e.location_name, address: e.address, people: e.people,
      reviewNote: e.review_note, takenDownReason: e.taken_down_reason, createdAt: e.created_at
    })),
    applications: apps,
    guests: g[0].n,
    promiseVersion: PROMISE_VERSION
  };
}

export async function createOrganizer(s: Staff, b: Record<string, unknown>) {
  const name = str(b.name, 40);
  if (name.length < 2) throw new CrmError('bad_request', '请写主办方名称（至少 2 个字）');
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO organizers (name, logo_url, public_contact, staff_note, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, /^https:\/\//.test(str(b.logoUrl, 500)) ? str(b.logoUrl, 500) : null, str(b.publicContact, 60) || null, str(b.staffNote, 200) || null, who(s)]
    );
    const c = await createCode(db, rows[0].id, 'owner', who(s));
    await audit(db, s, 'org_create', 'organizer', rows[0].id, { after: { name } });
    if (typeof b.applicationId === 'string' && UUID.test(b.applicationId)) {
      await db.query(`UPDATE org_applications SET status = 'done', handled_by = $2, handled_at = now() WHERE id = $1`, [b.applicationId, who(s)]);
    }
    return { id: rows[0].id, ...c, ...(await bindQr(c.code)) };
  });
}

export async function newOwnerCode(s: Staff, orgId: string) {
  if (!UUID.test(orgId)) throw new CrmError('not_found', '找不到这个主办方');
  const { rows } = await getPool().query(`SELECT status FROM organizers WHERE id = $1`, [orgId]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这个主办方');
  if (rows[0].status === 'suspended') throw new CrmError('bad_request', '主办方已停用，先恢复再出码');
  const c = await createCode(getPool(), orgId, 'owner', who(s));
  await audit(getPool(), s, 'org_code', 'organizer', orgId, {});
  return { ...c, ...(await bindQr(c.code)) };
}

/**
 * 审核用开通码（指令 57 第 4 条，迁移 0051）：给微信审核员用。可多人反复用，默认 60 天有效，可一键作废。
 * 都指向同一个演示主办方「SAREC 审核测试」（没有就建，停用了就恢复）。上线双击文件里跑 db/sql/org_review_code.sql 做同样的事。
 */
export async function newReviewCode(s: Staff, b: Record<string, unknown>) {
  const days = Math.max(1, Math.min(120, Math.floor(Number(b.days)) || 60));
  const code = randCode(10);
  const expiresAt = new Date(Date.now() + days * 86400_000);
  try {
    await withTransaction(async (db) => {
      const { rows } = await db.query<{ id: string }>(`SELECT id FROM organizers WHERE is_demo AND name = $1 ORDER BY created_at LIMIT 1 FOR UPDATE`, [DEMO_ORG_NAME]);
      let orgId = rows[0]?.id;
      if (!orgId) {
        const r = await db.query<{ id: string }>(
          `INSERT INTO organizers (name, staff_note, status, review_left, created_by, is_demo) VALUES ($1, '微信审核员用的演示主办方（不是真实主办方）', 'active', 0, $2, true) RETURNING id`,
          [DEMO_ORG_NAME, who(s)]);
        orgId = r.rows[0].id;
      } else {
        await db.query(`UPDATE organizers SET status = 'active', review_left = 0, suspended_at = NULL, suspended_by = NULL, suspend_reason = NULL, updated_at = now() WHERE id = $1`, [orgId]);
      }
      await db.query(`INSERT INTO organizer_codes (code, organizer_id, kind, created_by, expires_at, note) VALUES ($1, $2, 'review', $3, $4, '微信审核用')`, [code, orgId, who(s), expiresAt]);
      await audit(db, s, 'org_review_code', 'organizer_code', code, { after: { days } });
    });
  } catch (e) {
    if (/is_demo|kind_check|column/.test(String((e as Error).message))) throw new CrmError('bad_request', '数据库还没升级（迁移 0051），先跑迁移再出审核码');
    throw e;
  }
  return { code, expiresAt, message: `已出审核用开通码 ${code}（${days} 天内有效，可多人反复用）` };
}

/** 作废审核码：码不能再用。已经用它开通的审核员留在「SAREC 审核测试」里（要一并停用就在下面主办方列表里停用它） */
export async function revokeReviewCode(s: Staff, raw: unknown) {
  const code = String(raw ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(code)) throw new CrmError('bad_request', '审核码不对');
  const { rowCount } = await getPool().query(`UPDATE organizer_codes SET revoked_at = coalesce(revoked_at, now()), revoked_by = coalesce(revoked_by, $2) WHERE code = $1 AND kind = 'review'`, [code, who(s)]);
  if (!rowCount) throw new CrmError('not_found', '找不到这个审核码');
  await audit(getPool(), s, 'org_review_code_revoke', 'organizer_code', code, {});
  return { message: `已作废审核码 ${code}` };
}

export async function updateOrganizer(s: Staff, orgId: string, b: Record<string, unknown>) {
  if (!UUID.test(orgId)) throw new CrmError('not_found', '找不到这个主办方');
  const pool = getPool();
  const { rows } = await pool.query(`SELECT * FROM organizers WHERE id = $1`, [orgId]);
  const o = rows[0];
  if (!o) throw new CrmError('not_found', '找不到这个主办方');
  const action = String(b.action ?? '');
  if (action === 'suspend') {
    const reason = str(b.reason, 200);
    if (!reason) throw new CrmError('bad_request', '请写停用原因（会记下来）');
    await pool.query(`UPDATE organizers SET status = 'suspended', suspended_at = now(), suspended_by = $2, suspend_reason = $3, updated_at = now() WHERE id = $1`, [orgId, who(s), reason]);
    await audit(pool, s, 'org_suspend', 'organizer', orgId, { reason });
    return { message: `已停用「${o.name}」：他的活动全部下架，名单 30 天内负责人还能导出` };
  }
  if (action === 'resume') {
    await pool.query(`UPDATE organizers SET status = CASE WHEN agreed_at IS NULL THEN 'pending' ELSE 'active' END, suspended_at = NULL, suspended_by = NULL, suspend_reason = NULL, updated_at = now() WHERE id = $1`, [orgId]);
    await audit(pool, s, 'org_resume', 'organizer', orgId, {});
    return { message: `已恢复「${o.name}」` };
  }
  if (action === 'help') {
    await pool.query(`UPDATE organizers SET helps = helps + 1, updated_at = now() WHERE id = $1`, [orgId]);
    await audit(pool, s, 'org_help', 'organizer', orgId, { reason: str(b.note, 200) || null });
    return { message: '已记一次"商会帮忙"' };
  }
  if (action === 'edit') {
    const name = str(b.name, 40) || o.name;
    const reviewLeft = b.reviewLeft == null ? o.review_left : Math.max(0, Math.min(50, Math.floor(Number(b.reviewLeft)) || 0));
    const logo = b.logoUrl === undefined ? o.logo_url : /^https:\/\//.test(str(b.logoUrl, 500)) ? str(b.logoUrl, 500) : null;
    await pool.query(
      `UPDATE organizers SET name = $2, public_contact = $3, staff_note = $4, review_left = $5, logo_url = $6, updated_at = now() WHERE id = $1`,
      [orgId, name, b.publicContact === undefined ? o.public_contact : str(b.publicContact, 60) || null, b.staffNote === undefined ? o.staff_note : str(b.staffNote, 200) || null, reviewLeft, logo]
    );
    await audit(pool, s, 'org_edit', 'organizer', orgId, { before: { name: o.name, review_left: o.review_left }, after: { name, review_left: reviewLeft } });
    return { message: '已保存' };
  }
  throw new CrmError('bad_request', '操作不对，请刷新后再试');
}

export async function eventAction(s: Staff, eventId: string, b: Record<string, unknown>) {
  if (!UUID.test(eventId)) throw new CrmError('not_found', '找不到这场活动');
  return withTransaction(async (db) => {
    const { rows } = await db.query<OrgEvent>(`SELECT * FROM org_events WHERE id = $1 FOR UPDATE`, [eventId]);
    const ev = rows[0];
    if (!ev) throw new CrmError('not_found', '找不到这场活动');
    const action = String(b.action ?? '');
    const reason = str(b.reason, 200);
    if (action === 'approve') {
      if (ev.status !== 'review') throw new CrmError('bad_request', '这场活动不在"等放行"里');
      await db.query(`UPDATE org_events SET status = 'published', published_at = coalesce(published_at, now()), reviewed_by = $2, reviewed_at = now(), review_note = NULL WHERE id = $1`, [eventId, who(s)]);
      await db.query(`UPDATE organizers SET review_left = greatest(0, review_left - 1) WHERE id = $1`, [ev.organizer_id]);
    } else if (action === 'reject') {
      if (!reason) throw new CrmError('bad_request', '请写不放行的原因（主办方能看到）');
      await db.query(`UPDATE org_events SET status = 'rejected', reviewed_by = $2, reviewed_at = now(), review_note = $3 WHERE id = $1`, [eventId, who(s), reason]);
    } else if (action === 'takedown') {
      if (!reason) throw new CrmError('bad_request', '请写下架原因（主办方能看到）');
      await db.query(`UPDATE org_events SET status = 'taken_down', taken_down_by = $2, taken_down_reason = $3, taken_down_at = now() WHERE id = $1`, [eventId, who(s), reason]);
    } else if (action === 'restore') {
      if (ev.status !== 'taken_down' && ev.status !== 'rejected') throw new CrmError('bad_request', '这场活动没有下架');
      await db.query(`UPDATE org_events SET status = 'published', taken_down_by = NULL, taken_down_reason = NULL, taken_down_at = NULL, review_note = NULL, published_at = coalesce(published_at, now()) WHERE id = $1`, [eventId]);
    } else throw new CrmError('bad_request', '操作不对，请刷新后再试');
    await audit(db, s, `org_event_${action}`, 'org_event', eventId, { before: { status: ev.status }, reason: reason || null });
    return { message: { approve: '已放行，报名页公开了', reject: '已标为不放行', takedown: '已下架', restore: '已恢复' }[action] };
  });
}

export async function setSwitch(s: Staff, key: unknown, on: unknown) {
  const k = key === 'chain' ? 'org_chain_on' : key === 'tool' ? 'org_tool_on' : null;
  if (!k || typeof on !== 'boolean') throw new CrmError('bad_request', '开关不对，请刷新后再试');
  const before = k === 'org_chain_on' ? await chainOn() : await toolOn();
  await setSetting(getPool(), k, on, who(s));
  await audit(getPool(), s, 'setting', 'crm_settings', k, { before, after: on });
  return { message: `已${on ? '打开' : '关掉'}${k === 'org_chain_on' ? '接龙模式' : '活动工具总开关'}，马上生效` };
}

export async function handleApplication(s: Staff, id: string, status: unknown) {
  if (!UUID.test(id) || (status !== 'done' && status !== 'dismissed')) throw new CrmError('bad_request', '操作不对');
  await getPool().query(`UPDATE org_applications SET status = $2, handled_by = $3, handled_at = now() WHERE id = $1`, [id, status, who(s)]);
  return { message: status === 'done' ? '已标为处理完' : '已标为不用处理' };
}

/**
 * 平台查看名单（方案第 5 条：维护、投诉要查看要留痕）：只有管理员；必须写原因；每次记一笔 org_data_views。
 * 只给姓名、手机尾号、人数、到场——不给报名表回答和备注。
 */
export async function platformView(s: Staff, eventId: string, reason: unknown) {
  if (!s.roles.includes('admin')) throw new CrmError('forbidden', '只有管理员能查看主办方的名单');
  const why = str(reason, 200);
  if (why.length < 4) throw new CrmError('bad_request', '请写查看原因（例如"处理某某投诉"），会记下来');
  if (!UUID.test(eventId)) throw new CrmError('not_found', '找不到这场活动');
  const pool = getPool();
  const { rows: e } = await pool.query<OrgEvent>(`SELECT * FROM org_events WHERE id = $1`, [eventId]);
  if (!e[0]) throw new CrmError('not_found', '找不到这场活动');
  await pool.query(`INSERT INTO org_data_views (actor, organizer_id, event_id, reason) VALUES ($1, $2, $3, $4)`, [who(s), e[0].organizer_id, eventId, why]);
  const { rows } = await pool.query<{ name: string; phone: string | null; party_size: number; status: string; checked_in_at: Date | null }>(
    `SELECT name, phone, party_size, status, checked_in_at FROM org_regs WHERE event_id = $1 AND status <> 'cancelled' ORDER BY created_at`, [eventId]);
  return { title: e[0].title, people: rows.map((r) => ({ name: r.name, phone: r.phone ? '尾号 ' + r.phone.slice(-4) : '', partySize: r.party_size, status: r.status, checkedIn: !!r.checked_in_at })) };
}

export async function viewLog() {
  const { rows } = await getPool().query(
    `SELECT v.actor, v.reason, v.created_at, e.title, o.name AS organizer FROM org_data_views v LEFT JOIN org_events e ON e.id = v.event_id LEFT JOIN organizers o ON o.id = v.organizer_id ORDER BY v.created_at DESC LIMIT 50`);
  return rows;
}

/**
 * 试用看板（方案第 10 条）：每个主办方 —— 开通到第一次发布多久、第一次发布填了多久、发了几场、报名 / 签到顺不顺（自己扫码签到占比、取消数）、
 * 商会帮了几次、有没有自己再办第二场、有没有人从「我也要办活动」进来申请。
 */
export async function trial() {
  const pool = getPool();
  const { rows } = await pool.query<{
    id: string; name: string; status: string; agreed_at: Date | null; helps: number; first_at: Date | null; first_secs: number | null; events: number; self_made: number;
    regs: number; people: number; arrived_people: number; self_scan: number; by_org: number; cancelled: number; apps: number; exports: number;
  }>(
    `SELECT o.id, o.name, o.status, o.agreed_at, o.helps,
            (SELECT min(e.created_at) FROM org_events e WHERE e.organizer_id = o.id) AS first_at,
            (SELECT e.compose_secs FROM org_events e WHERE e.organizer_id = o.id ORDER BY e.created_at LIMIT 1) AS first_secs,
            (SELECT count(*)::int FROM org_events e WHERE e.organizer_id = o.id AND e.status <> 'rejected') AS events,
            (SELECT count(*)::int FROM org_events e WHERE e.organizer_id = o.id AND e.copied_from IS NOT NULL) AS self_made,
            (SELECT count(*)::int FROM org_regs r JOIN org_events e ON e.id = r.event_id WHERE e.organizer_id = o.id AND r.status <> 'cancelled') AS regs,
            (SELECT coalesce(sum(r.party_size), 0)::int FROM org_regs r JOIN org_events e ON e.id = r.event_id WHERE e.organizer_id = o.id AND r.status = 'registered') AS people,
            (SELECT coalesce(sum(r.party_size), 0)::int FROM org_regs r JOIN org_events e ON e.id = r.event_id WHERE e.organizer_id = o.id AND r.checked_in_at IS NOT NULL) AS arrived_people,
            (SELECT count(*)::int FROM org_regs r JOIN org_events e ON e.id = r.event_id WHERE e.organizer_id = o.id AND r.checkin_method = 'self_scan') AS self_scan,
            (SELECT count(*)::int FROM org_regs r JOIN org_events e ON e.id = r.event_id WHERE e.organizer_id = o.id AND r.checkin_method = 'organizer') AS by_org,
            (SELECT count(*)::int FROM org_regs r JOIN org_events e ON e.id = r.event_id WHERE e.organizer_id = o.id AND r.status = 'cancelled') AS cancelled,
            (SELECT count(*)::int FROM org_applications a JOIN org_events e ON e.id = a.from_event WHERE e.organizer_id = o.id) AS apps,
            (SELECT count(*)::int FROM org_exports x WHERE x.organizer_id = o.id) AS exports
       FROM organizers o WHERE NOT coalesce((to_jsonb(o)->>'is_demo')::boolean, false) ORDER BY o.created_at`
  );
  const { rows: tot } = await pool.query<{ apps: number; from_events: number }>(
    `SELECT count(*)::int AS apps, count(*) FILTER (WHERE a.from_event IS NOT NULL)::int AS from_events
       FROM org_applications a LEFT JOIN org_events e ON e.id = a.from_event LEFT JOIN organizers o ON o.id = e.organizer_id
      WHERE NOT coalesce((to_jsonb(o)->>'is_demo')::boolean, false)`); // 审核演示主办方的活动页点进来的申请不算
  const mins = (a: Date | null, b: Date | null) => (a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)) : null);
  return {
    rows: rows.map((r) => ({
      id: r.id, name: r.name, status: r.status, helps: r.helps,
      openToFirstMin: mins(r.agreed_at, r.first_at), firstComposeSecs: r.first_secs,
      events: r.events, secondByThemselves: r.events >= 2, repeats: r.self_made,
      regs: r.regs, people: r.people, rate: r.people ? Math.round((r.arrived_people / r.people) * 100) : null,
      selfScan: r.self_scan, byOrganizer: r.by_org, cancelled: r.cancelled, apps: r.apps, exports: r.exports
    })),
    applications: tot[0]
  };
}
