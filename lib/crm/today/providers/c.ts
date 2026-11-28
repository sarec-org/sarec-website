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
    href: `/zh/staff/jobs/reports?id=${r.id}`,
    at: r.created_at.toISOString(),
    actions: [{ type: 'link', label: '去处理', href: `/zh/staff/jobs/reports?id=${r.id}`, primary: true }]
  }));
}

// 7) 失败和异常（待处理）
/**
 * 失败和异常（J13-4）：每类一个人话标题 + 一句建议。原始报错（常是邮件 / 短信服务的英文）不进建议，只放在收起来的“看详情”里。
 */
const FAILURE: Record<string, { title: string; suggest: string }> = {
  followup_email: { title: '新咨询的通知邮件没发出去', suggest: '咨询本身已在「待跟进」里，不会丢；点“重试”再发一次邮件' },
  photo_notice: { title: '相册通知没发出去', suggest: '照片已经传好了，只是没通知到场的人；点“重试”再发' },
  photo_upload: { title: '有照片没传上去', suggest: '到「相册」里把这张照片重新传一次' },
  followup_scan: { title: '每天的跟进扫描出错了', suggest: '今天可能有该提醒的跟进没生成；点“重试”再扫一次' },
  agent_lead_email: { title: 'AI 助手线索的通知邮件没发出去', suggest: '线索已在「待跟进」里；点“重试”再发邮件' },
  pay_link: { title: '付款链接没送到本人', suggest: '打开这个人的档案，用电话或微信把付款链接发给他' },
  contact_merge: { title: '有两份档案要人工核对后合并', suggest: '到「合并重复档案」看一眼是不是同一个人' },
  wecom_unmatched: { title: '企业微信新好友没对上档案', suggest: '在企业微信里看看是谁，到客户档案里补上' },
  join_scan: { title: '入会申请扫描出错了', suggest: '可能有申请没自动提醒；点“重试”再扫一次' },
  join_link: { title: '入会缴费链接没发出去', suggest: '到「入会申请」里点“短信再发缴费链接”，或复制链接用微信发' },
  prep_reminder: { title: '筹备清单提醒没发出去', suggest: '到「活动筹备清单」看看今天到期的项；点“重试”再发提醒' },
  pay_reminder: { title: '付款提醒没发出去', suggest: '点“重试”再发；急的话直接电话或微信提醒本人' },
  newsletter_queue: { title: '邮件通讯接着发的时候出错了', suggest: '到「邮件通讯」看还剩多少没发，点“接着发”' },
  newsletter_send: { title: '邮件通讯有几封没发出去', suggest: '系统会自动重试；也可以到「邮件通讯」点“接着发”' },
  post_event: { title: '活动回顾整理出错了', suggest: '点“重试”再整理一次；不行就到「活动回顾」手动写' },
  feature_report: { title: '功能月报没生成', suggest: '点“重试”再生成一次，不急' },
  agent_digest: { title: 'AI 助手日报没发出去', suggest: '点“重试”再发一次，不急' },
  junk_digest: { title: '推销和垃圾咨询的每日汇总没发出去', suggest: '到「待跟进」筛“推销 / 垃圾”直接处理；点“重试”再发汇总' },
  staff_notify: { title: '给工作人员的手机通知出错了', suggest: '有通知可能没发到手机上；先在「今天」里把事办了，再点“重试”' },
  flow_cron: { title: '每天自动跑的任务出错了', suggest: '点“重试”再跑一次；还不行交给开发看' },
  confirm_unreachable: { title: '活动出席确认消息全部没发出去', suggest: '请电话或微信直接问本人来不来（系统不记爽约、不转候补）' },
  jobs_no_pros: { title: '找工人：有条活儿发了，但没有对口的接活人可以通知', suggest: '看看这个工种和城市有没有可以邀请来登记的师傅；也可以电话告诉发布人先等等' },
  jobs_no_contact: { title: '找工人：有条活儿发了 24 小时还没人联系', suggest: '系统已经通知了第二批接活人；可以打电话问问发布人还需不需要，或帮忙推荐师傅' },
  jobs_cslb: { title: '找工人：这周的加州承包商牌照比对没做成', suggest: '到「接活人核验」里一键打开官方详情页，人工核对新登记和要复核的牌照' },
  jobs_license: { title: '找工人：有接活人的执照出了问题，已自动下架', suggest: '已经通知本人更新执照；到「接活人核验」看一眼原因' },
  jobs_review: { title: '找工人：有接活人到了 90 天复核', suggest: '到「接活人核验」打开官方查询页重新核对执照或营业登记' },
  jobs_verify: { title: '找工人：有接活人等核验', suggest: '到「接活人核验」照清单核对，通过或退回' },
  jobs_report: { title: '找工人：有人反馈或投诉', suggest: '到「找工人接活儿投诉」看内容，处理后标已处理' }
};
const CONFIRM_FAILED: Record<string, string> = { ask: '问出席的消息', remind: '出席提醒', released: '转候补的通知', offer: '候补补位的通知' };

/** 原始报错 → 一句人话。中文报错本来就是给人看的，照用；英文的按常见原因翻成人话，认不出就说“原文在详情里” */
export function humanizeError(raw: string | null | undefined): string {
  const e = (raw ?? '').trim();
  if (!e) return '原因没记下来';
  if (/[\u4e00-\u9fff]/.test(e)) {
    // 中文报错：括号里常是英文原因，去掉；「」里是名字，检查时不算；GitHub、CSLB、Zelle 这类名字照留
    const zh = e.replace(/（[^）]*）|\([^)]*\)/g, '').trim();
    const probe = zh.replace(/「[^」]*」/g, '').replace(/GitHub|CSLB|Zelle|Excel|Twilio/g, '');
    if (!/[A-Za-z]{6,}/.test(probe)) return zh.length > 80 ? zh.slice(0, 80) + '…' : zh;
  }
  if (/domain.*(not verified|verify)|verify a domain/i.test(e)) return '发件域名还没在邮件服务里验证，邮件发不出去';
  if (/rate.?limit|too many requests|\b429\b/i.test(e)) return '发得太快，被对方服务限流了，过一会儿重试就行';
  if (/timeout|timed out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|fetch failed|network|socket hang up/i.test(e)) return '没连上对方的服务（网络问题），过一会儿重试就行';
  if (/unauthori[sz]ed|forbidden|invalid api key|api key|\b401\b|\b403\b|authenticat/i.test(e)) return '对方服务的密钥或权限不对，需要开发看一下';
  if (/(invalid|not a valid).*(phone|number|mobile)|unverified.*number|21211|21608|21614/i.test(e)) return '这个手机号收不了短信（号码不对或测试号码），请换电话或微信联系';
  if (/(invalid|not a valid).*e-?mail|recipient|bounced|mailbox/i.test(e)) return '这个邮箱地址收不到邮件，请换别的方式联系';
  if (/download|csv|master/i.test(e)) return '官方名单没下载下来';
  return '系统报了一个错（原文在“看详情”里）';
}

function failureText(kind: string): { title: string; suggest: string } {
  if (FAILURE[kind]) return FAILURE[kind];
  const m = /^confirm_(\w+)_failed$/.exec(kind);
  if (m) return { title: `活动${CONFIRM_FAILED[m[1]] ?? '通知'}没发出去`, suggest: '请电话或微信直接联系本人' };
  if (kind.startsWith('jobs_cron_')) return { title: '找工人：每天自动跑的任务出错了', suggest: '点“重试”再跑一次；还不行交给开发看' };
  return { title: '有一件自动办的事没办成', suggest: '点“重试”再试一次；还不行交给开发看' };
}

async function failures(): Promise<TodayItem[]> {
  // 指令 102：「有接活人等核验」不再单独出一条（「接活人待核验」那一条带通过 / 不通过，办完这条异常自动关掉）
  const { rows } = await getPool().query<{ id: string; kind: string; error: string | null; updated_at: Date; attempts: number; ref: string | null }>(
    `SELECT id, kind, error, updated_at, attempts, ref FROM ops_exceptions WHERE status = 'open' AND kind <> 'jobs_verify' ORDER BY updated_at DESC LIMIT 10`
  );
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return rows.map((x) => {
    // 指令 102：接活人执照出问题 / 到 90 天复核的，链接直达这一个人（不再落到「待跟进 › 异常」总页）
    const proHref = (x.kind === 'jobs_review' || x.kind === 'jobs_license') && x.ref && UUID.test(x.ref) ? `/zh/staff/jobs/pros?id=${x.ref}` : null;
    const f = failureText(x.kind);
    const why = humanizeError(x.error);
    return {
      kind: 'exception',
      id: `exception:${x.id}`,
      priority: PRIORITY.other + 10,
      title: f.title,
      suggestion: `${why.replace(/[。.]$/, '')}。${f.suggest}；不用管的点“不处理”。`,
      // 原始报错只放在收起来的“看详情”里
      detail: x.error ? `系统记下的原文：${x.error.slice(0, 500)}${x.attempts > 1 ? `\n（已经出过 ${x.attempts} 次）` : ''}` : undefined,
      href: proHref ?? '/zh/staff/followups?tab=exceptions',
      at: x.updated_at.toISOString(),
      actions: proHref ? [
        { type: 'link', label: '打开这个人', href: proHref, primary: true },
        { type: 'post', label: '看过了', endpoint: '/api/v1/staff/exceptions', body: { id: x.id, action: 'ignore' } }
      ] : [
        { type: 'post', label: '重试', endpoint: '/api/v1/staff/exceptions', body: { id: x.id, action: 'retry' }, primary: true },
        { type: 'post', label: '不处理', endpoint: '/api/v1/staff/exceptions', body: { id: x.id, action: 'ignore' } }
      ]
    };
  });
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
