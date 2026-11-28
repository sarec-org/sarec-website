/**
 * 子任务 B 的待办来源：新咨询、会员和访客跟进（含推销垃圾汇总一条）、待核款、活动回顾待发布、接活人待核验
 */
import { getPool } from '@/lib/db/client';
import { CATEGORY_LABEL, contactActions, draftFor, loadCards, teamMembers, voiceFor } from '@/lib/crm/followupKit';
import { headline } from '@/lib/crm/followupMail';
import { realContact } from '@/lib/crm/accountKind';
import { tradeMap } from '@/lib/jobs/trades';
import { checklistFor } from '@/lib/jobs/verify';
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
          { type: 'link' as const, label: '没收到 / 去核款页', href: `/zh/staff/payments?id=${encodeURIComponent(o.order_no)}` }
        ],
        href: `/zh/staff/payments?id=${encodeURIComponent(o.order_no)}`,
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

/** 退回时告诉本人的原因（今天页一键「不通过」用；要写别的原因到核验页里选 / 自己写） */
export const PRO_RETURN_REASON = '商会核对资料时没对上（牌照 / 执照号、名称或工种），请检查后改好重新提交；有疑问可以联系商会';

/**
 * 接活人待核验（找工人·接活儿）：新登记的、核验后又改了工种 / 牌照的。
 * 指令 102：每条直接带「通过」「不通过」（照活儿放行「派给师傅 / 不派」的写法），点了就生效、这一条自动消失；
 * 「打开」去核验页并定位到这一个人（看证件、官方查询页、只通过部分工种、换退回原因）。
 */
export const jobsProProvider: TodayProvider = {
  kind: 'jobs_pro_verify',
  roles: ['ops'],
  async list() {
    type Row = { id: string; name: string; trade_keys: string[]; trades: string[]; needs_review: boolean; status: string; updated_at: Date; license_no: string | null; ls: { state?: string; active?: boolean; problems?: string[] } | null };
    const { rows } = await getPool().query<Row>(
      `SELECT p.id, p.name, p.trades AS trade_keys, ARRAY(SELECT coalesce(t.name, x) FROM unnest(p.trades) x LEFT JOIN jobs_trades t ON t.key = x) AS trades,
              p.needs_review, p.status, p.updated_at, p.license_no, p.license_state AS ls
         FROM jobs_pros p WHERE p.status = 'pending' OR (p.needs_review AND p.status <> 'removed') ORDER BY p.updated_at LIMIT 30`
    );
    const tm = rows.length ? await tradeMap() : new Map();
    return rows.map((p) => {
      const href = `/zh/staff/jobs/pros?status=pending&id=${p.id}`;
      const checklist = checklistFor({ trades: p.trade_keys }, tm);
      const cslb = p.ls?.state === 'done' ? (p.ls.active ? '加州承包商牌照自动查：有效。' : `加州承包商牌照自动查：有问题（${clip((p.ls.problems ?? []).join('；') || '看核验页', 40)}），建议先打开看一眼。`) : p.ls?.state === 'queued' ? '牌照正在自动查，几分钟出结果。' : '';
      return {
        id: `jobs_pro:${p.id}`,
        kind: 'jobs_pro_verify' as const,
        priority: PRIORITY.review,
        title: p.status === 'pending' ? `${p.name} 登记接活（${clip(p.trades.join('、') || '未选工种', 30)}），等核验` : `${p.name} 核验后又改了工种或牌照，等再看一次`,
        suggestion: `${cslb}${p.license_no ? `牌照 / 执照号 ${p.license_no}。` : ''}点「通过」会弹出核验清单，逐条勾完才能确认（上找工人列表、通知本人）；对不上点「不通过」（退回让他改）。要看证件、只通过部分工种点「打开」。`,
        actions: [
          { type: 'post' as const, label: '通过', endpoint: `/api/v1/workbench/jobs/pros/${p.id}/verify`, body: { action: 'approve' }, checklist, primary: true, done: `${p.name} 核验通过，本人会收到通知` },
          { type: 'post' as const, label: '不通过', endpoint: `/api/v1/workbench/jobs/pros/${p.id}/verify`, body: { action: 'return', reason: PRO_RETURN_REASON }, confirm: `不通过「${p.name}」？会退回给本人，告诉他：${PRO_RETURN_REASON}。（要写别的原因点「打开」）`, done: '已退回，本人会收到原因', danger: true },
          { type: 'link' as const, label: '打开', href }
        ],
        href,
        tags: ['待核验'],
        at: p.updated_at.toISOString()
      };
    });
  }
};

/**
 * 1.5.1 指令 46：小程序里交来的「发布活儿」（请商会帮忙找师傅）——先进这里，工作人员看一眼原话再派。
 * 「派给师傅」= 转成找人中并通知对口、核验过的接活人；「不派」= 下架（客户在小程序里看不到任何公开列表，不受影响）。
 */
export const jobsRequestProvider: TodayProvider = {
  kind: 'jobs_request',
  roles: ['ops'],
  async list() {
    const { rows } = await getPool()
      .query<{ id: string; description: string; phone: string | null; city: string; trade: string; name: string; created_at: Date; sec_status: string | null }>(
        `SELECT p.id, p.description, p.phone, COALESCE(jc.name, p.city) AS city, COALESCE(t.name, p.trade_key) AS trade, COALESCE(NULLIF(c.name, ''), '一位客户') AS name, p.created_at, p.sec_status
           FROM jobs_posts p JOIN contacts c ON c.id = p.contact_id
           LEFT JOIN jobs_cities jc ON jc.key = p.city_key LEFT JOIN jobs_trades t ON t.key = p.trade_key
          WHERE p.status = 'pending' ORDER BY p.created_at LIMIT 30`
      )
      .catch(() => ({ rows: [] as { id: string; description: string; phone: string | null; city: string; trade: string; name: string; created_at: Date; sec_status: string | null }[] }));
    return rows.map((r) => ({
      id: `jobs_request:${r.id}`,
      kind: 'jobs_request' as const,
      priority: PRIORITY.review - 1,
      title: `${r.name} 在小程序请商会找师傅：${r.trade} · ${r.city}`,
      suggestion: `原话：“${clip(r.description, 60)}”。看一眼没问题就派给师傅（会通知对口、核验过的师傅）；不合适就不派。${r.sec_status === 'review' ? '微信检测建议人工看一眼。' : ''}`,
      detail: r.description,
      actions: [
        { type: 'post' as const, label: '派给师傅', endpoint: `/api/v1/workbench/jobs/posts/${r.id}`, body: { action: 'approve' }, primary: true, done: '已派出' },
        ...(r.phone ? [{ type: 'tel' as const, label: '打电话', phone: r.phone }] : []),
        { type: 'post' as const, label: '不派', endpoint: `/api/v1/workbench/jobs/posts/${r.id}`, body: { action: 'remove', note: '今天页：不派' }, confirm: '不派这一条？客户那边不会收到通知。', done: '已不派', danger: true },
        { type: 'link' as const, label: '打开', href: `/zh/staff/jobs?status=pending&id=${r.id}` }
      ],
      href: `/zh/staff/jobs?status=pending&id=${r.id}`,
      tags: ['找师傅'],
      at: r.created_at.toISOString()
    }));
  }
};

/** 不放行时告诉主办方的原因（今天页一键「不放行」用；要写别的到「主办方」页） */
export const ORG_REJECT_REASON = '内容需要修改，请联系商会后再发';

/** 指令 102：主办方的活动等放行（先审后发 / 机器检测建议复核）——每条直接带「放行」「不放行」 */
export const orgEventReviewProvider: TodayProvider = {
  kind: 'org_event_review',
  roles: ['ops'],
  async list() {
    type Row = { id: string; title: string; org: string; sec_status: string | null; created_at: Date };
    const { rows } = await getPool()
      .query<Row>(
        `SELECT e.id, e.title, o.name AS org, e.sec_status, e.created_at FROM org_events e JOIN organizers o ON o.id = e.organizer_id
          WHERE e.status = 'review' ORDER BY e.created_at LIMIT 30`
      )
      .catch(() => ({ rows: [] as Row[] }));
    return rows.map((e) => {
      const href = `/zh/staff/organizers#ev-${e.id}`;
      return {
        id: `org_event:${e.id}`,
        kind: 'org_event_review' as const,
        priority: PRIORITY.review - 2,
        title: `主办方「${clip(e.org, 20)}」的活动「${clip(e.title, 30)}」等放行`,
        suggestion: `${e.sec_status === 'review' ? '微信内容检测建议人工看一眼。' : ''}看过没问题点「放行」（报名页公开）；不合适点「不放行」。`,
        actions: [
          { type: 'post' as const, label: '放行', endpoint: '/api/v1/staff/organizers', body: { action: 'event', op: 'approve', id: e.id }, primary: true, done: '已放行，报名页公开了' },
          { type: 'post' as const, label: '不放行', endpoint: '/api/v1/staff/organizers', body: { action: 'event', op: 'reject', id: e.id, reason: ORG_REJECT_REASON }, confirm: `不放行这场活动？主办方会看到原因：${ORG_REJECT_REASON}。（要写别的原因点「打开」）`, done: '已标为不放行', danger: true },
          { type: 'link' as const, label: '打开', href }
        ],
        href,
        tags: ['等放行'],
        at: e.created_at.toISOString()
      };
    });
  }
};

export const B_PROVIDERS: TodayProvider[] = [recapProvider, paymentProvider, followupProvider, inquiryProvider, jobsProProvider, jobsRequestProvider, orgEventReviewProvider];
