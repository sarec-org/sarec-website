/**
 * D10：活儿「情况说明」的微信内容安全检查（沿用 lib/crm/contentSec.ts 的 msgSecCheck 和它的降级逻辑）。
 * 结果记在 jobs_posts.sec_status：pass / review / risky / unchecked（未检测：没配微信密钥、发布人没有小程序 openid、接口出错）。
 * 只有 pass 的进小程序「通知给我的活儿」。网站上的发布、显示不受影响（不因此拦发布）。
 */
import { msgSecCheck } from '@/lib/crm/contentSec';
import { wxConfigured } from '@/lib/crm/wechat';
import type { Db } from '@/lib/crm/profile';

export type SecStatus = 'pass' | 'review' | 'risky' | 'unchecked';
export type SecOutcome = { status: SecStatus; note: string | null };

export async function openidOf(db: Db, contactId: string): Promise<string | null> {
  const { rows } = await db.query<{ openid: string | null }>(`SELECT wechat_openid AS openid FROM contacts WHERE id = $1`, [contactId]);
  return rows[0]?.openid ?? null;
}

/** 检查一段情况说明；openid 用发布人的（没有就是未检测） */
export async function checkDescription(text: string, openid: string | null): Promise<SecOutcome> {
  if (!text.trim()) return { status: 'pass', note: 'empty' };
  if (!wxConfigured()) return { status: 'unchecked', note: 'no_wx_config' };
  if (!openid) return { status: 'unchecked', note: 'no_openid' };
  const r = await msgSecCheck(text, openid, 1);
  if (r === 'pass' || r === 'review' || r === 'risky') return { status: r, note: null };
  return { status: 'unchecked', note: r === 'skipped' ? 'no_openid' : 'error' };
}

export async function saveSec(db: Db, postIds: string[], o: SecOutcome): Promise<void> {
  if (!postIds.length) return;
  await db.query(`UPDATE jobs_posts SET sec_status = $2, sec_note = $3, sec_checked_at = now() WHERE id = ANY($1::uuid[])`, [postIds, o.status, o.note]);
}
