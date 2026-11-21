/**
 * 子任务 C 的待办来源（入会 3 天未缴费、筹备清单今天到期 / 一项没人动、照片名片待审、重复档案待确认、投诉、失败异常）和「今天现场」。
 * 接口见 ../types.ts（B 定义）。内部账号 / 审核演示 / 测试账号的事不进待办。
 */
import { getPool } from '@/lib/db/client';
import { laToday } from '@/lib/laDate';
import { realContact, realContactId } from '../../accountKind';
import { PRIORITY, type TodayContext, type TodayItem, type TodayLive, type TodayLiveProvider, type TodayProvider } from '../types';

const fmtDay = (d: Date | string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric' }).format(new Date(d));
const fmtTime = (d: Date | string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));

// 1) 入会申请 3 天没缴费 → 人工跟一次
async function joinUnpaid(): Promise<TodayItem[]> {
  const { rows } = await getPool().query<{ id: string; name: string; phone: string | null; created_at: Date; link_sent_at: Date | null }>(
    `SELECT j.id, j.name, j.phone, j.created_at, j.link_sent_at FROM join_requests j JOIN contacts c ON c.id = j.contact_id
      WHERE j.status IN ('new', 'link_sent') AND j.created_at < now() - interval '3 days' AND j.nudged_at IS NULL AND ${realContact('c')}
      ORDER BY j.created_at LIMIT 30`
  );
  return rows.map((j) => ({
    kind: 'join_unpaid',
    id: `join_unpaid:${j.id}`,
    priority: PRIORITY.money + 10,
    title: `入会申请 3 天还没缴费：${j.name}`,
    suggestion: `${fmtDay(j.created_at)} 申请${j.link_sent_at ? `，${fmtDay(j.link_sent_at)} 已发缴费链接` : ''}。建议打个电话或发微信问一句，有问题帮他办；跟过了点“我跟进了”。`,
    href: `/zh/staff/join-requests?id=${j.id}`,
    at: j.created_at.toISOString(),
    tags: ['钱'],
    actions: [
      ...(j.phone ? [{ type: 'tel' as const, label: '打电话', phone: j.phone }] : []),
      { type: 'post', label: '再发一次缴费链接', endpoint: '/api/v1/staff/join-requests', body: { id: j.id, action: 'send_link', channel: j.phone ? 'sms' : 'copy' } },
      { type: 'post', label: '我跟进了', endpoint: '/api/v1/staff/join-requests', body: { id: j.id, action: 'nudged' } }
    ]
  }));
}

// 2) 筹备清单：今天到期（含已过期没打勾、活动还没结束）的项，手机上直接打勾
async function prepDue(ctx: Pick<TodayContext, 'now' | 'today'>): Promise<TodayItem[]> {
  const now = ctx.now;
  const today = ctx.today;
  const { rows } = await getPool().query<{ id: number; event_id: string; title: string; role: string; due_at: Date; event_title: string }>(
    `SELECT i.id, i.event_id, i.title, i.role, i.due_at, e.title AS event_title
       FROM event_prep_items i JOIN events e ON e.id = i.event_id
      WHERE i.done_at IS NULL AND e.event_status <> 'cancelled'
        AND (i.due_at AT TIME ZONE 'America/Los_Angeles')::date <= $1::date
        AND coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '1 day'
      ORDER BY i.due_at LIMIT 40`,
    [today]
  );
  return rows.map((i) => {
    const overdue = new Date(i.due_at).getTime() < now.getTime() && laToday(new Date(i.due_at)) < today;
    return {
      kind: 'prep_due',
      id: `prep_due:${i.id}`,
      priority: PRIORITY.review + (overdue ? 5 : 10),
      title: `筹备「${i.event_title}」：${i.title}`,
      suggestion: `${overdue ? `已过期（${fmtDay(i.due_at)} 到期）` : `今天 ${fmtTime(i.due_at)} 前`}，负责：${i.role}。做完直接打勾。`,
      href: `/zh/staff/prep/${i.event_id}`,
      at: new Date(i.due_at).toISOString(),
      actions: [
        { type: 'post', label: '打勾：做完了', endpoint: `/api/v1/staff/prep/${i.event_id}`, body: { action: 'toggle', itemId: i.id, done: true }, primary: true, done: '已打勾' },
        { type: 'link', label: '打开清单', href: `/zh/staff/prep/${i.event_id}` }
      ]
    };
  });
}

// 3) 一项都没人动的筹备清单：活动前 3 天提醒东哥一次（进今天 + 每日汇总）
async function prepIdle(): Promise<TodayItem[]> {
  const { rows } = await getPool().query<{ event_id: string; title: string; starts_at: Date; n: number }>(
    `SELECT p.event_id, e.title, e.starts_at, (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = p.event_id) AS n
       FROM event_prep p JOIN events e ON e.id = p.event_id
      WHERE e.event_status = 'scheduled' AND e.starts_at > now() AND e.starts_at <= now() + interval '3 days'
        AND EXISTS (SELECT 1 FROM event_prep_items i WHERE i.event_id = p.event_id)
        AND NOT EXISTS (SELECT 1 FROM event_prep_items i WHERE i.event_id = p.event_id AND (i.done_at IS NOT NULL OR i.note IS NOT NULL AND i.note <> '' OR i.photo_url IS NOT NULL))
        AND p.assignees = '{}'::jsonb`
  );
  return rows.map((p) => ({
    kind: 'prep_due',
    id: `prep_idle:${p.event_id}`,
    priority: PRIORITY.review + 1,
    title: `「${p.title}」${fmtDay(p.starts_at)} 开始，筹备清单 ${p.n} 项还没人动`,
    suggestion: '建议今天把负责人分下去，或自己先把到期的几项打勾。',
    href: `/zh/staff/prep/${p.event_id}`,
    actions: [{ type: 'link', label: '打开清单分配', href: `/zh/staff/prep/${p.event_id}`, primary: true }]
  }));
}

// 4) 照片和名片待审
async function reviews(): Promise<TodayItem[]> {
  const pool = getPool();
  const out: TodayItem[] = [];
  const { rows: ph } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM event_photos p WHERE p.review_status = 'review' AND p.visibility = 'album' AND p.variant_of IS NULL AND NOT p.is_hidden
        AND (p.uploader_contact_id IS NULL OR ${realContactId('p.uploader_contact_id')})`
  ).catch(() => ({ rows: [{ n: 0 }] }));
  if (ph[0]?.n) out.push({
    kind: 'media_review', id: 'media_review:photos', priority: PRIORITY.review + 30, title: `${ph[0].n} 张客户上传的照片待审`,
    suggestion: '看一眼，合适的点通过，不合适的点不通过。', href: '/zh/staff/cards?tab=photos',
    actions: [{ type: 'link', label: '去审照片', href: '/zh/staff/cards?tab=photos', primary: true }]
  });
  const { rows: cd } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM member_cards m JOIN contacts c ON c.id = m.contact_id
      WHERE m.hidden_at IS NULL AND m.content_updated_at IS NOT NULL AND (m.reviewed_at IS NULL OR m.reviewed_at < m.content_updated_at) AND ${realContact('c')}`
  ).catch(() => ({ rows: [{ n: 0 }] }));
  if (cd[0]?.n) out.push({
    kind: 'media_review', id: 'media_review:cards', priority: PRIORITY.review + 31, title: `${cd[0].n} 张电子名片待审`,
    suggestion: '名片文字或头像改过，看一眼没问题点通过。', href: '/zh/staff/cards',
    actions: [{ type: 'link', label: '去审名片', href: '/zh/staff/cards', primary: true }]
  });
  return out;
}

// 5) 拿不准的重复档案（手机号相同且已验证的已自动合并；这里只剩同名这类）
async function dupConfirm(): Promise<TodayItem[]> {
  const { uncertainPairs } = await import('../../autoMerge');
  const pairs = await uncertainPairs(5);
  return pairs.map((p) => ({
    kind: 'dup_confirm',
    id: `dup_confirm:${p.a.id}:${p.b.id}`,
    priority: PRIORITY.review + 40,
    title: `可能是同一个人：${p.a.name}（#${p.a.memberNo}）和 ${p.b.name}（#${p.b.memberNo}）`,
    suggestion: `${p.why.join('、')}。看一眼两份档案，是同一个人就合并（可以撤销），不是就点“不是”。`,
    href: '/zh/staff/duplicates',
    actions: [
      { type: 'post', label: '是同一个人，合并', endpoint: '/api/v1/staff/duplicates', body: { action: 'merge', keptId: p.keep, mergedId: p.keep === p.a.id ? p.b.id : p.a.id, reason: '今天页确认' }, primary: true, done: '已合并（可以在“合并重复档案”里撤销）', confirm: '合并后可以在“合并重复档案”里撤销。确定合并？' },
      { type: 'post', label: '不是同一个人', endpoint: '/api/v1/staff/duplicates', body: { action: 'not_dup', a: p.a.id, b: p.b.id } },
      { type: 'link', label: '打开对比', href: '/zh/staff/duplicates' }
    ]
  }));
}

// 6) 投诉（找工人·接活儿 举报）
async function complaints(): Promise<TodayItem[]> {
  const { rows } = await getPool().query<{ id: string; reason: string; target_type: string; created_at: Date }>(
    `SELECT r.id, r.reason, r.target_type, r.created_at FROM jobs_reports r
      WHERE r.status = 'open' AND (r.reporter_contact_id IS NULL OR ${realContactId('r.reporter_contact_id')})
      ORDER BY r.created_at LIMIT 20`
  ).catch(() => ({ rows: [] as { id: string; reason: string; target_type: string; created_at: Date }[] }));
  return rows.map((r) => ({
    kind: 'complaint',
    id: `complaint:${r.id}`,
    priority: PRIORITY.review + 20,
    title: `找工人·接活儿 有人投诉${r.target_type === 'pro' ? '一位接活人' : '一条活儿'}`,
    suggestion: `${fmtDay(r.created_at)}：${r.reason.slice(0, 60)}。看一眼，属实就下架，处理完写一句结果。`,
    href: '/zh/staff/jobs/reports',
    at: r.created_at.toISOString(),
    actions: [{ type: 'link', label: '去处理', href: '/zh/staff/jobs/reports', primary: true }]
  }));
}

// 7) 失败和异常（待处理）
const FAILURE_TEXT: Record<string, string> = {
  followup_email: '通知邮件没发出去', photo_notice: '相册通知没发出去', followup_scan: '每日跟进扫描出错', agent_lead_email: 'AI 助手线索邮件没发出去',
  pay_link: '付款链接没送到本人', contact_merge: '有两份档案需要人工核对后合并', wecom_unmatched: '企业微信新好友没关联上档案', join_scan: '入会申请扫描出错',
  prep_reminder: '筹备提醒没发出去', pay_reminder: '付款提醒没发出去', newsletter_queue: '邮件通讯续发出错', post_event: '活动回顾整理出错', feature_report: '功能月报出错', agent_digest: 'AI 助手日报出错', join_link: '缴费链接没发出去'
};
async function failures(): Promise<TodayItem[]> {
  const { rows } = await getPool().query<{ id: string; kind: string; error: string | null; updated_at: Date; attempts: number }>(
    `SELECT id, kind, error, updated_at, attempts FROM ops_exceptions WHERE status = 'open' ORDER BY updated_at DESC LIMIT 10`
  );
  return rows.map((x) => ({
    kind: 'exception',
    id: `exception:${x.id}`,
    priority: PRIORITY.other + 10,
    title: FAILURE_TEXT[x.kind] ?? '有一件事没办成',
    suggestion: `${(x.error ?? '').slice(0, 80) || '原因没记下'}。点“重试”再试一次；不用管的点“不处理”。`,
    href: '/zh/staff/followups?tab=exceptions',
    at: x.updated_at.toISOString(),
    actions: [
      { type: 'post', label: '重试', endpoint: '/api/v1/staff/exceptions', body: { id: x.id, action: 'retry' }, primary: true },
      { type: 'post', label: '不处理', endpoint: '/api/v1/staff/exceptions', body: { id: x.id, action: 'ignore' } }
    ]
  }));
}


export const C_PROVIDERS: TodayProvider[] = [
  { kind: 'join_unpaid', roles: ['ops'], list: () => joinUnpaid() },
  { kind: 'prep_due', roles: ['ops', 'checkin'], list: async (ctx) => [...(await prepIdle()), ...(await prepDue(ctx))] },
  { kind: 'complaint', roles: ['ops'], list: () => complaints() },
  { kind: 'media_review', roles: ['ops'], list: () => reviews() },
  { kind: 'dup_confirm', roles: ['ops'], list: () => dupConfirm() },
  { kind: 'exception', roles: ['ops'], list: () => failures() }
];

// ── 今天现场：今天（洛杉矶）有活动时，最上面三个大按钮 ─────────────────────────
export async function todayLive(ctx: Pick<TodayContext, 'today'>): Promise<TodayLive[]> {
  const { rows } = await getPool().query<{ id: string; title: string; starts_at: Date }>(
    `SELECT id, title, starts_at FROM events
      WHERE event_status <> 'cancelled' AND (starts_at AT TIME ZONE 'America/Los_Angeles')::date = $1::date ORDER BY starts_at`,
    [ctx.today]
  );
  return rows.map((e) => ({
    eventId: e.id,
    title: `${fmtTime(e.starts_at)} ${e.title}`,
    buttons: [
      { label: '签到台', href: `/zh/staff/checkin?event=${e.id}` },
      { label: '现场登记', href: `/zh/staff/checkin?event=${e.id}&onsite=1` },
      { label: '传照片', href: `/zh/staff/album?event=${e.id}` }
    ]
  }));
}
export const C_LIVE_PROVIDERS: TodayLiveProvider[] = [{ roles: ['checkin', 'ops'], list: (ctx) => todayLive(ctx) }];
