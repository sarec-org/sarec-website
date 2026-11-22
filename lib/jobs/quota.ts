/**
 * 指令 9 · D28：免费额度。
 * - 接活儿（看发布人电话）：收费方式 = 免费额度 时，非会员（施工队、持牌师傅、设计与专业服务）每看一条新活儿的电话扣一次，
 *   同一条活儿重复看不扣（jobs_contacts 里已经有这一行就不算新的）；用完 → code 'quota_used_up'。会员、工人、全部免费时都不扣。
 *   扣过的那一行 jobs_contacts.free_used = true（统计“用了免费额度的人数”）；用完那一刻记 jobs_pros.free_used_up_at（统计“用完后入会的人数”）。
 * - 发活儿：非会员免费发 freePosts 次（按一次发布算，一次选几个工种拆成几条也只算一次）；null = 不限。会员不限。
 * 小程序里不出现任何金额：这里的文字都不带钱数。
 */
import { CrmError } from '@/lib/crm/events';
import { memberStatus } from '@/lib/crm/membership';
import type { Db } from '@/lib/crm/profile';
import type { Switches } from './settings';

export const QUOTA_USED_UP_TEXT = '免费次数用完了，成为商会会员后可以继续';
export const POST_QUOTA_USED_UP_TEXT = '免费发布次数用完了，成为商会会员后可以继续发布';
/** J9-3：用完（0）时不说“还可以免费联系 0 位”，直接说用完了 */
export const freeLeftText = (n: number) => (n > 0 ? `还可以免费联系 ${n} 位` : QUOTA_USED_UP_TEXT);

type ProLike = { id: string; contact_id: string; role: string; is_paid_member: boolean };

/** 这个人看发布人电话要不要扣免费次数 */
export function quotaApplies(p: ProLike, s: Pick<Switches, 'feeMode'>): boolean {
  return s.feeMode === 'free_quota' && p.role !== 'worker' && !p.is_paid_member;
}

export async function freeUsed(db: Db, contactId: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM jobs_contacts WHERE direction = 'post' AND viewer_contact_id = $1 AND free_used`,
    [contactId]
  );
  return rows[0]?.n ?? 0;
}

/** 还能免费联系几位；不适用（会员、工人、全部免费、必须是会员）时为 null */
export async function freeLeftFor(db: Db, p: ProLike, s: Pick<Switches, 'feeMode' | 'freeContacts'>): Promise<number | null> {
  if (!quotaApplies(p, s)) return null;
  return Math.max(0, s.freeContacts - (await freeUsed(db, p.contact_id)));
}

export async function alreadyContacted(db: Db, postId: string, contactId: string): Promise<boolean> {
  const { rows } = await db.query(`SELECT 1 FROM jobs_contacts WHERE direction = 'post' AND post_id = $1 AND viewer_contact_id = $2`, [postId, contactId]);
  return rows.length > 0;
}

/** 用完那一刻记一下（只记第一次） */
export async function markUsedUp(db: Db, proId: string): Promise<void> {
  await db.query(`UPDATE jobs_pros SET free_used_up_at = now() WHERE id = $1 AND free_used_up_at IS NULL`, [proId]);
}

/** 发活儿：非会员超过免费条数 → post_quota_used_up（工作人员、会员不限；freePosts = null 不限） */
export async function checkPostQuota(db: Db, contactId: string, s: Pick<Switches, 'freePosts'>, staff: boolean): Promise<void> {
  if (s.freePosts == null || staff) return;
  const member = (await memberStatus(db, contactId).catch(() => ({ isMember: false }))).isMember;
  if (member) return;
  const { rows } = await db.query<{ n: number }>(`SELECT count(DISTINCT batch_id)::int AS n FROM jobs_posts WHERE contact_id = $1`, [contactId]);
  if ((rows[0]?.n ?? 0) >= s.freePosts) {
    throw new CrmError('post_quota_used_up', s.freePosts > 0 ? `${POST_QUOTA_USED_UP_TEXT}（非会员可以免费发 ${s.freePosts} 次）` : '非会员暂时不能发布活儿，成为商会会员后就可以发布');
  }
}
