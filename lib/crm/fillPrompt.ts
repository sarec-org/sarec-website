/**
 * 1.5.0 体验1 · 第三部分 6：匿名“微信用户”（没有真实姓名或手机号）在合适的时机提示补填。
 * 服务器只回答"该不该提示、缺什么、在哪些时机可以提示、文案"，小程序照着做：
 *   · 可以提示的时机 moments：'home'（打开首页、首页加载完以后）、'me'（进「我的」页）、'after_success'（报名 / 加入成功页的下方，不挡成功提示）；
 *   · 不许提示的地方 never：签到、出错页、付款 / 入会缴费、报名表填写中（交互总则第 8 条：不在签到、出错时弹）。
 *   · 本人点"以后再说"→ POST { action: 'later' }，7 天内不再提示；累计 3 次以后不再主动提示。
 *   · 本人填了 → POST { action: 'fill', name, phone }，补进档案，并补齐“待补填”的专委会意向。
 * 不提示的人：工作人员、内部 / 审核演示 / 测试账号、建档不到 1 天的新人（先让人逛一逛；有待补填的专委会意向的例外）。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';
import { staffFor } from './auth';
import { committeeProfile, requireNamePhone } from './staff12';

export const FILL_MOMENTS = ['home', 'me', 'after_success'] as const;
export const FILL_NEVER = ['checkin', 'error', 'pay', 'register_form'] as const;
export const SNOOZE_DAYS = 7;
export const MAX_DISMISSALS = 3;

export type FillPrompt = {
  show: boolean;
  /** 缺什么：'name' 姓名、'phone' 手机号 */
  missing: ('name' | 'phone')[];
  /** 为什么提示：committee = 有专委会意向等补填；anonymous = 只是没登记 */
  reason: 'committee' | 'anonymous' | null;
  /** 已有的姓名（只缺手机时带出来，不让人重填） */
  prefillName: string | null;
  moments: readonly string[];
  never: readonly string[];
  title: string;
  body: string;
};

const NO: Omit<FillPrompt, 'missing' | 'prefillName'> = { show: false, reason: null, moments: FILL_MOMENTS, never: FILL_NEVER, title: '', body: '' };

export async function fillPrompt(contactId: string | null): Promise<FillPrompt> {
  if (!contactId) return { ...NO, missing: [], prefillName: null };
  const p = await committeeProfile(contactId);
  const missing = [...(p.name ? [] : ['name' as const]), ...(p.phone ? [] : ['phone' as const])];
  const base = { ...NO, missing, prefillName: p.name };
  if (!missing.length) return base;
  const { rows } = await getPool().query<{ kind: string | null; snoozed: Date | null; n: number; created_at: Date }>(
    `SELECT account_kind AS kind, fill_prompt_snoozed_until AS snoozed, fill_prompt_dismissals AS n, created_at FROM contacts WHERE id = $1`,
    [contactId]
  );
  const c = rows[0];
  if (!c || c.kind) return base;
  if (await staffFor(contactId)) return base;
  if (c.snoozed && c.snoozed.getTime() > Date.now()) return base;
  if (c.n >= MAX_DISMISSALS) return base;
  const reason = p.needsFill ? 'committee' : 'anonymous';
  if (reason === 'anonymous' && Date.now() - c.created_at.getTime() < 24 * 3600_000) return base;
  const what = missing.map((m) => (m === 'name' ? '姓名' : '手机号')).join('和');
  return {
    ...base,
    show: true,
    reason,
    title: reason === 'committee' ? `补一下${what}，负责人好联系您` : `留个${what}吧`,
    body:
      reason === 'committee'
        ? `您表达过专委会意向，但还没留${what}。补上以后负责人能直接联系您。`
        : `留下${what}，报名、签到、入会都不用再填；活动有变动也能及时通知您。商会不会公开您的手机号。`
  };
}

export async function fillPromptAction(contactId: string, b: { action?: string; name?: unknown; phone?: unknown }) {
  const pool = getPool();
  if (b.action === 'later') {
    await pool.query(
      `UPDATE contacts SET fill_prompt_snoozed_until = now() + make_interval(days => $2), fill_prompt_dismissals = fill_prompt_dismissals + 1 WHERE id = $1`,
      [contactId, SNOOZE_DAYS]
    );
    return { message: '好的，以后在「我的」里也能随时补填', prompt: await fillPrompt(contactId) };
  }
  if (b.action === 'fill') {
    const { name, phone } = await requireNamePhone(contactId, { name: b.name, phone: b.phone }, '补填资料');
    await pool.query(`UPDATE committee_interests SET name = $2, phone = $3, needs_fill = false WHERE contact_id = $1 AND needs_fill`, [contactId, name, phone]);
    await pool.query(`UPDATE contacts SET fill_prompt_filled_at = now() WHERE id = $1`, [contactId]);
    return { message: '已保存，谢谢', prompt: await fillPrompt(contactId) };
  }
  throw new CrmError('bad_request', '不支持的操作');
}
