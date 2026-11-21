/**
 * 后台综合优化 七.2：重复档案自动合并。
 * - 手机号相同、并且两边都已验证（登录 / 验证码验证过）的 → 系统自动合并，留合并记录（contact_merges.auto = true），
 *   在“合并重复档案”页可以一键撤销（和人工合并同一套 mergeContacts / undoMerge）。
 * - 其余疑似重复（同名、未验证的号码、邮箱相同……）拿不准 → 进「今天」让人确认。
 * - 保留哪一份：工作人员账号 > 有效会员 > 报名多的 > 建档早的。两边都是工作人员账号的不合并（交给人）。
 * 定时任务每天跑一次（daily-ops）；正式库的第一次批量用 scripts/admin-oneoff-merge-dups.ts（默认只看不改）。
 */
import { getPool } from '@/lib/db/client';
import type { Staff } from './auth';
import { duplicateSuggestions, mergeContacts, type DupPair } from './dupMerge';

export const AUTO_MERGER: Staff = { contactId: '00000000-0000-0000-0000-000000000000', email: 'system', name: '系统自动合并', roles: ['admin'] };

export type AutoPair = { phone: string; keptId: string; mergedId: string; keptName: string; mergedName: string; keptNo: number; mergedNo: number };

type Info = { id: string; name: string; member_no: number; is_staff: boolean; is_member: boolean; regs: number; created_at: Date };

async function infos(ids: string[]): Promise<Map<string, Info>> {
  const { rows } = await getPool().query<Info>(
    `SELECT c.id, c.name, c.member_no::int, c.created_at,
            EXISTS (SELECT 1 FROM staff_roles s WHERE s.mp_contact_id = c.id OR (s.email = c.email AND c.email_verified_at IS NOT NULL)) AS is_staff,
            EXISTS (SELECT 1 FROM applications a WHERE a.contact_id = c.id AND a.membership_end_date >= current_date
                     AND (a.application_status IN ('approved','paid','second_payment_due') OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))) AS is_member,
            (SELECT count(*)::int FROM registrations r WHERE r.contact_id = c.id AND r.status <> 'cancelled') AS regs
       FROM contacts c WHERE c.id = ANY($1::uuid[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

/** 谁留下：工作人员 > 会员 > 报名多 > 建档早 */
export function pickKeep(a: Info, b: Info): Info {
  const score = (x: Info) => [x.is_staff ? 1 : 0, x.is_member ? 1 : 0, x.regs, -new Date(x.created_at).getTime()];
  const sa = score(a);
  const sb = score(b);
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] > sb[i] ? a : b;
  return a.member_no <= b.member_no ? a : b;
}

/** 手机号相同且两边都已验证的档案对（都还没合并、没被标“不是同一个人”） */
export async function verifiedPhonePairs(): Promise<AutoPair[]> {
  const { rows } = await getPool().query<{ a: string; b: string; phone: string }>(
    `WITH live AS (SELECT id FROM contacts WHERE merged_into IS NULL),
     v AS (
       SELECT c.id, c.phone_e164 AS phone FROM contacts c JOIN live l ON l.id = c.id WHERE c.phone_e164 IS NOT NULL AND c.phone_verified_at IS NOT NULL
       UNION
       SELECT m.contact_id, m.value FROM contact_methods m JOIN live l ON l.id = m.contact_id WHERE m.kind = 'phone' AND m.status = 'confirmed'
     )
     SELECT DISTINCT ON (x.id, y.id) x.id AS a, y.id AS b, x.phone
       FROM v x JOIN v y ON x.phone = y.phone AND x.id < y.id
      WHERE NOT EXISTS (SELECT 1 FROM contact_not_duplicates n WHERE n.a_id = x.id AND n.b_id = y.id)
      ORDER BY x.id, y.id`
  );
  if (!rows.length) return [];
  const info = await infos(Array.from(new Set(rows.flatMap((r) => [r.a, r.b]))));
  const out: AutoPair[] = [];
  for (const r of rows) {
    const a = info.get(r.a);
    const b = info.get(r.b);
    if (!a || !b) continue;
    if (a.is_staff && b.is_staff) continue; // 两份都是工作人员账号：交给人
    const keep = pickKeep(a, b);
    const drop = keep.id === a.id ? b : a;
    if (drop.is_staff) continue;
    out.push({ phone: r.phone, keptId: keep.id, mergedId: drop.id, keptName: keep.name, mergedName: drop.name, keptNo: keep.member_no, mergedNo: drop.member_no });
  }
  return out;
}

/** 自动合并（apply = false 只列出来，不改数据） */
export async function autoMergeVerified(opts: { apply: boolean; limit?: number } = { apply: true }) {
  const done: (AutoPair & { mergeId?: string; error?: string })[] = [];
  const touched = new Set<string>();
  const limit = opts.limit ?? 200;
  for (let round = 0; round < 5 && done.length < limit; round++) {
    const pairs = (await verifiedPhonePairs()).filter((p) => !touched.has(p.keptId) && !touched.has(p.mergedId));
    if (!pairs.length) break;
    for (const p of pairs) {
      if (done.length >= limit) break;
      if (touched.has(p.keptId) || touched.has(p.mergedId)) continue;
      touched.add(p.mergedId);
      if (!opts.apply) { touched.add(p.keptId); done.push(p); continue; }
      try {
        const r = await mergeContacts(AUTO_MERGER, p.keptId, p.mergedId, `手机号 ${p.phone.slice(0, -4)}**** 相同且两边都已验证，系统自动合并`);
        await getPool().query(`UPDATE contact_merges SET auto = true WHERE id = $1`, [r.mergeId]);
        done.push({ ...p, mergeId: r.mergeId });
      } catch (e) {
        done.push({ ...p, error: e instanceof Error ? e.message : 'error' });
      }
    }
    if (!opts.apply) break;
  }
  return { count: done.filter((d) => !d.error).length, items: done };
}

/** 拿不准的疑似重复（自动合并处理不了的）：进「今天」让人确认。内部 / 测试账号不进。 */
export async function uncertainPairs(limit = 5): Promise<(DupPair & { keep: string })[]> {
  const auto = new Set((await verifiedPhonePairs()).map((p) => [p.keptId, p.mergedId].sort().join(':')));
  const all = await duplicateSuggestions(60);
  const ids = Array.from(new Set(all.flatMap((p) => [p.a.id, p.b.id])));
  const { rows } = ids.length
    ? await getPool().query<{ id: string }>(`SELECT id FROM contacts WHERE id = ANY($1::uuid[]) AND account_kind IS NOT NULL`, [ids])
    : { rows: [] as { id: string }[] };
  const notReal = new Set(rows.map((r) => r.id));
  const list = all.filter((p) => !auto.has([p.a.id, p.b.id].sort().join(':')) && !notReal.has(p.a.id) && !notReal.has(p.b.id)).slice(0, limit);
  if (!list.length) return [];
  const info = await infos(Array.from(new Set(list.flatMap((p) => [p.a.id, p.b.id]))));
  return list.map((p) => {
    const a = info.get(p.a.id);
    const b = info.get(p.b.id);
    return { ...p, keep: a && b ? pickKeep(a, b).id : p.a.id };
  });
}
