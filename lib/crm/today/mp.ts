/**
 * 1.5.0 体验1 · 第三部分 1：小程序工作台的「今天」（GET /api/v1/staff/today 带 X-Sarec-Client: mp-… 头或来自小程序时）。
 * 和网站后台是同一份待办，只做三件事：
 *   1. 钱相关的条目整条去掉（待核款、入会未缴费、带「钱」标签的、标题 / 建议里出现收款字样的；详情里有收款字样的只去掉详情）——小程序里不出现金额；
 *   2. 按钮里去掉指向收款页面 / 收款接口的；
 *   3. 每条加 mpPath：小程序里打开这一条的页面（工作台「今天」页按 item 定位到这一条），通知落地页（第 8 条）用同一个地址。
 */
import type { TodayAction, TodayItem, TodayKind, TodayPayload } from './types';

/** 钱相关的待办类型：小程序里整类不出现 */
export const MP_MONEY_KINDS: TodayKind[] = ['payment_pending', 'join_unpaid'];
/** 收款字样（和 /api/v1/staff/prep 小程序过滤同一套） */
export const PAY_WORDS = /收费|缴费|付款|费用|Zelle|Stripe|核款|收款|会费|价格|到账|\$\s*\d|美元/i;
const MONEY_LINK = /^\/(zh\/staff\/(payments|rooms|settings)|api\/v1\/staff\/(orders|settings|rooms|bookings|points|screen-ads|offers|room-info))(\/|\?|$)/;

/** 小程序工作台「今天」页的路径（小程序分包 pages/staff 下新加 today 页；item = 待办 id） */
export const MP_TODAY_PAGE = '/pages/staff/today';
export function mpPathFor(itemId: string): string {
  return `${MP_TODAY_PAGE}?item=${encodeURIComponent(itemId)}`;
}

export function isMoneyItem(it: TodayItem): boolean {
  if (MP_MONEY_KINDS.includes(it.kind)) return true;
  if (it.tags?.includes('钱')) return true;
  // 标题 / 建议里就有收款字样的（例如筹备清单里的"核对 Zelle 收款"）整条不给；详情里有的只去掉详情（客户原话问到会费很常见）
  return PAY_WORDS.test(it.title) || PAY_WORDS.test(it.suggestion);
}

function safeAction(a: TodayAction): boolean {
  if (a.type === 'link') return !MONEY_LINK.test(a.href);
  if (a.type === 'post') return !MONEY_LINK.test(a.endpoint);
  if (a.type === 'sms' || a.type === 'copy') return !PAY_WORDS.test(a.type === 'sms' ? a.body : a.text);
  if (a.type === 'mailto') return !PAY_WORDS.test(a.subject + a.body);
  return true;
}

export type MpTodayItem = TodayItem & { mpPath: string };
export type MpTodayPayload = Omit<TodayPayload, 'items'> & { items: MpTodayItem[]; hiddenMoney: number };

/**
 * 指令 102：1.7.2 以前的小程序把 /zh/staff/jobs… 一律转成不带标签的「找工人·接活儿」页，落到第一个标签「开关」，找不到要审的。
 * 对这些旧版本：指向 /zh/staff/jobs… 的「打开」按钮去掉、标题不再跳转（href 置空 → 旧版「今天」页就地显示这一条，
 * 「通过 / 不通过」「派给师傅 / 不派」按钮就在卡片上）。1.7.2 起小程序保留标签和那一条（?tab=pros&id=…），照常给。
 */
const JOBS_HREF = /^\/zh\/staff\/jobs(\/|\?|#|$)/;
function legacyJobs(it: TodayItem): TodayItem {
  if (!JOBS_HREF.test(it.href) && !it.actions.some((a) => a.type === 'link' && JOBS_HREF.test(a.href))) return it;
  return { ...it, href: JOBS_HREF.test(it.href) ? '' : it.href, actions: it.actions.filter((a) => !(a.type === 'link' && JOBS_HREF.test(a.href))) };
}

export function forMiniProgram(p: TodayPayload, opts: { legacyJobsLink?: boolean } = {}): MpTodayPayload {
  const keep = p.items.filter((it) => !isMoneyItem(it)).map((it) => (opts.legacyJobsLink ? legacyJobs(it) : it));
  return {
    ...p,
    items: keep.map((it) => ({ ...it, detail: it.detail && PAY_WORDS.test(it.detail) ? undefined : it.detail, actions: it.actions.filter(safeAction), mpPath: mpPathFor(it.id) })),
    // 只给条数不给内容：小程序可以写"另有 N 件收款的事请在网站后台办"（不出现金额）
    hiddenMoney: p.items.length - keep.length
  };
}

/**
 * 第三部分 8：网站后台地址 → 小程序工作台里对应那一条的路径（通知点开的落地页）。
 *   · /zh/staff/followups/<编号> → /pages/staff/today?item=followup:<编号>（和今天页那一条同一个编号）
 *   · 收款相关（核款、会议室、设置、新会员缴费入会的档案）→ null：小程序里不放钱，只能在网站后台办
 *   · 其他后台地址 → /pages/staff/today?h=<地址>（小程序按地址转到能办的那一页，办不了的给「复制后台网址」）
 */
const MONEY_HREF = /^\/zh\/staff\/(payments|rooms|settings)(\/|\?|#|$)/;
export function mpPathForHref(href: string | null | undefined, category?: string): string | null {
  if (!href) return MP_TODAY_PAGE;
  if (MONEY_HREF.test(href) || category === 'paid_join' || category === 'zelle_pending') return null;
  const f = /^\/zh\/staff\/followups\/([0-9a-f-]{36})(?:[?#].*)?$/i.exec(href);
  if (f) return mpPathFor(`followup:${f[1]}`);
  // 指令 102：接活人核验 / 小程序交来的活儿 → 「今天」里那一条（卡片上就有通过 / 不通过、派给师傅 / 不派），旧版小程序也不会落到「开关」
  const jp = /^\/zh\/staff\/jobs\/pros\?(?:.*&)?id=([0-9a-f-]{36})/i.exec(href);
  if (jp) return mpPathFor(`jobs_pro:${jp[1]}`);
  const jr = /^\/zh\/staff\/jobs\?(?:.*&)?id=([0-9a-f-]{36})/i.exec(href);
  if (jr) return mpPathFor(`jobs_request:${jr[1]}`);
  if (href === '/zh/staff' || href === '/zh/staff/') return MP_TODAY_PAGE;
  return `${MP_TODAY_PAGE}?h=${encodeURIComponent(href)}`;
}
