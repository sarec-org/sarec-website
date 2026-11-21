/**
 * 子任务 B 的待办来源：新咨询、会员和访客跟进（含推销垃圾汇总一条）、待核款、活动回顾待发布、接活人待核验
 */
import { getPool } from '@/lib/db/client';
import { CATEGORY_LABEL, contactActions, draftFor, loadCards, teamMembers, voiceFor } from '@/lib/crm/followupKit';
import { headline } from '@/lib/crm/followupMail';
import { realContact } from '@/lib/crm/accountKind';
import { PRIORITY, type TodayItem, type TodayProvider } from '../types';

const money = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 });
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

/** 新咨询 + 会员和访客跟进：同一次查询，按"有没有联系过、过没过期"分到两类 */
async function followupItems(ctx: Parameters<TodayProvider['list']>[0]): Promise<TodayItem[]> {
  const cards = await loadCards({ open: true, limit: 500, real: true }); // 八.1：内部 / 审核演示 / 测试账号不进待办
  const team = await teamMembers().catch(() => []);
  const out: TodayItem[] = [];
  const junk = cards.filter((c) => c.status === 'todo' && c.category !== 'customer');
  for (const c of cards) {
    if (c.category !== 'customer') continue;
    const isNew = (c.source === 'inquiry' || c.source === 'agent_lead') && !c.lastContactAt && c.status === 'todo' && c.overdueDays === 0;
    const due = c.nextDate ? c.nextDate <= ctx.today : c.status === 'todo';
    if (!isNew && !due) continue;
    // 谁联系就用谁的口气：有负责人按负责人，没有按现在看的人
    const v = voiceFor(team, c.owner || ctx.staff.name);
    const draft = draftFor(c, v);
    const { what, suggest } = headline(c);
    const band = c.overdueDays > 0 ? PRIORITY.overdue : PRIORITY.inquiry;
    const tags = [c.isMember ? '会员' : '', c.overdueDays > 0 ? `过期 ${c.overdueDays} 天` : '', c.owner ? `负责人 ${c.owner}` : ''].filter(Boolean);
    out.push({
      id: `followup:${c.id}`,
      kind: isNew ? 'inquiry_new' : 'followup',
      priority: band + (c.isMember ? 0 : 10),
      title: what,
      suggestion: `${suggest}${draft ? (c.isMember ? '；草稿已按对会员的口气写好' : '；草稿已写好') : ''}`,
      actions: [
        ...contactActions(c, draft),
        { type: 'post', label: '不跟进', endpoint: `/api/v1/staff/followups/${c.id}/act`, body: { action: 'drop' }, done: '已标为不跟进' }
      ],
      href: `/zh/staff/followups/${c.id}`,
      tags,
      at: c.nextDate ? `${c.nextDate}T00:00:00Z` : c.createdAt,
      detail: draft ? clip(draft, 200) : undefined,
      contactResult: { endpoint: `/api/v1/staff/followups/${c.id}/result` }
    });
  }
  if (junk.length) {
    const pitch = junk.filter((c) => c.category === 'pitch').length;
    out.push({
      id: 'followup:junk',
      kind: 'inquiry_new',
      priority: PRIORITY.inquiry + 90,
      title: `${junk.length} 条咨询像是推销或垃圾（${CATEGORY_LABEL.pitch} ${pitch}、${CATEGORY_LABEL.spam} ${junk.length - pitch}）`,
      suggestion: '建议全部不跟进；分错了的点开那一条改回"客户咨询"',
      actions: [
        { type: 'post', label: '全部不跟进', endpoint: '/api/v1/staff/followups/junk', body: { ids: junk.map((c) => c.id) }, done: '已全部标为不跟进', primary: true },
        { type: 'link', label: '先看一眼', href: '/zh/staff/followups?cat=junk' }
      ],
      href: '/zh/staff/followups?cat=junk',
      tags: ['推销 / 垃圾'],
      detail: junk.slice(0, 3).map((c) => `${c.name || '未留称呼'}：${clip(c.message || c.need || '', 40)}`).join('\n')
    });
  }
  return out;
}

/** 两类共享一次查询：同一个 ctx 只查一次 */
const cache = new WeakMap<object, Promise<TodayItem[]>>();
const shared = (ctx: Parameters<TodayProvider['list']>[0]) => {
  let p = cache.get(ctx);
  if (!p) {
    p = followupItems(ctx);
    cache.set(ctx, p);
  }
  return p;
};

export const inquiryProvider: TodayProvider = {
  kind: 'inquiry_new',
  roles: ['ops'],
  list: async (ctx) => (await shared(ctx)).filter((x) => x.kind === 'inquiry_new')
};
export const followupProvider: TodayProvider = {
  kind: 'followup',
  roles: ['ops'],
  list: async (ctx) => (await shared(ctx)).filter((x) => x.kind === 'followup')
};

/** 待核款：客户说已经用 Zelle 付了、等工作人员核对到账 */
export const paymentProvider: TodayProvider = {
  kind: 'payment_pending',
  roles: ['finance'],
  async list() {
    const { rows } = await getPool().query<{
      order_no: string; purpose: string; description: string | null; amount_cents: number; payer_name: string | null; payer_note: string | null;
      submitted_at: Date | null; created_at: Date; name: string; member_no: number | null;
    }>(
      `SELECT o.order_no, o.purpose, o.description, o.amount_cents, o.payer_name, o.payer_note, o.submitted_at, o.created_at, c.name, c.member_no::int
         FROM orders o JOIN contacts c ON c.id = o.contact_id
        WHERE o.status = 'payment_submitted' AND ${realContact('c')} ORDER BY coalesce(o.submitted_at, o.created_at) LIMIT 50`
    );
    return rows.map((o) => {
      const amt = money(o.amount_cents);
      const what = o.description || '一笔费用';
      return {
        id: `payment:${o.order_no}`,
        kind: 'payment_pending' as const,
        priority: PRIORITY.money,
        title: `${o.name} 说已用 Zelle 付了${clip(what, 24)} ${amt}，等您核对`,
        suggestion: `打开银行 App 看有没有收到 ${amt}${o.payer_name ? `（付款人 ${o.payer_name}）` : ''}${o.payer_note ? `，备注"${clip(o.payer_note, 30)}"` : ''}；收到了就点"确认到账"`,
        actions: [
          { type: 'post' as const, label: '确认到账', endpoint: `/api/v1/staff/orders/${encodeURIComponent(o.order_no)}/verify`, body: {}, confirm: `确认已经在银行看到这笔 ${amt} 到账？`, done: '已确认到账', primary: true },
          { type: 'link' as const, label: '没收到 / 去核款页', href: `/zh/staff/payments?q=${encodeURIComponent(o.order_no)}` }
        ],
        href: `/zh/staff/payments?q=${encodeURIComponent(o.order_no)}`,
        tags: ['钱'],
        at: (o.submitted_at ?? o.created_at).toISOString()
      };
    });
  }
};

/** 一.3 活动回顾待发布：置顶，"看一眼" + "直接发布" */
export const recapProvider: TodayProvider = {
  kind: 'recap_publish',
  roles: ['ops'],
  async list() {
    const { rows } = await getPool().query<{ event_id: string; title: string; starts_at: Date; arrived: number | null; photos: number | null }>(
      // 到场人数现数，去掉内部 / 审核演示 / 测试账号（八.1）
      `SELECT r.event_id, e.title, e.starts_at,
              (SELECT count(*)::int FROM registrations rg JOIN contacts c ON c.id = rg.contact_id
                WHERE rg.event_id = r.event_id AND rg.arrival_status = 'checked_in' AND ${realContact('c')}) AS arrived,
              coalesce((r.stats->>'staffPhotos')::int, 0) + coalesce((r.stats->>'guestPhotos')::int, 0) AS photos
         FROM event_recaps r JOIN events e ON e.id = r.event_id WHERE r.status = 'drafted' ORDER BY e.starts_at LIMIT 20`
    );
    return rows.map((r) => {
      const d = new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric' }).format(r.starts_at);
      return {
        id: `recap:${r.event_id}`,
        kind: 'recap_publish' as const,
        priority: PRIORITY.pinned,
        title: `${d}「${clip(r.title, 30)}」的活动回顾已整理好，还没发布`,
        suggestion: `系统已写好回顾、挑好精选照片${r.arrived != null ? `（到场 ${r.arrived} 人、照片 ${r.photos ?? 0} 张）` : ''}；看一眼没问题就直接发布`,
        actions: [
          { type: 'link' as const, label: '看一眼', href: `/zh/staff/recaps?event=${r.event_id}`, primary: true },
          {
            type: 'post' as const,
            label: '直接发布',
            endpoint: `/api/v1/staff/recaps/${r.event_id}/publish`,
            body: {},
            confirm: '按系统整理好的初稿直接发布？发布后网站回顾更新、相册发布并通知到场的人。',
            done: '已发布'
          }
        ],
        href: `/zh/staff/recaps?event=${r.event_id}`,
        tags: ['置顶'],
        at: r.starts_at.toISOString()
      };
    });
  }
};

/** 接活人待核验（找工人·接活儿）：新登记的、核验后又改了工种 / 牌照的 */
export const jobsProProvider: TodayProvider = {
  kind: 'jobs_pro_verify',
  roles: ['ops'],
  async list() {
    const { rows } = await getPool().query<{ id: string; name: string; trades: string[]; needs_review: boolean; status: string; updated_at: Date }>(
      `SELECT p.id, p.name, ARRAY(SELECT coalesce(t.name, x) FROM unnest(p.trades) x LEFT JOIN jobs_trades t ON t.key = x) AS trades,
              p.needs_review, p.status, p.updated_at
         FROM jobs_pros p WHERE p.status = 'pending' OR (p.needs_review AND p.status <> 'removed') ORDER BY p.updated_at LIMIT 30`
    );
    return rows.map((p) => ({
      id: `jobs_pro:${p.id}`,
      kind: 'jobs_pro_verify' as const,
      priority: PRIORITY.review,
      title: p.status === 'pending' ? `${p.name} 登记接活（${clip(p.trades.join('、') || '未选工种', 30)}），等核验` : `${p.name} 核验后又改了工种或牌照，等再看一次`,
      suggestion: '打开核验页：持牌工种查牌照（加州承包商自动查），对照核验清单通过或退回',
      actions: [{ type: 'link' as const, label: '去核验', href: `/zh/staff/jobs/pros?status=pending&id=${p.id}`, primary: true }],
      href: `/zh/staff/jobs/pros?status=pending&id=${p.id}`,
      tags: ['待核验'],
      at: p.updated_at.toISOString()
    }));
  }
};

export const B_PROVIDERS: TodayProvider[] = [recapProvider, paymentProvider, followupProvider, inquiryProvider, jobsProProvider];
