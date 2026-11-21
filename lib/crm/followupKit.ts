/**
 * 待跟进 · 后台综合优化 B（第二部分 一.2、四）
 * ------------------------------------------------------------------
 * - 咨询自动分类：客户咨询 / 合作或推销 / 垃圾（只用规则，不调 AI；工作人员可一键改）。只有客户咨询生成建议联系内容，语言跟对方一致。
 * - 会员识别：待跟进里是缴费会员的标"会员"，草稿用对会员的口气。
 * - 草稿按谁来联系：会长本人用会长口气，其他工作人员（助理）用工作人员口气；已过期的带一句致歉。
 * - 联系按钮：打电话、发短信（带草稿，sms:）、发邮件（带草稿，mailto:，系统不发）、复制手机号去微信加好友；有微信号显示微信号。
 * - 联系回填：联系上了 / 没接 / 已约时间 → 自动改状态、记时间。
 * - 来源标签按实际来源显示：系统自动生成的（入会申请、报名满员、工作台标记……）不再显示"手动添加"。
 */
import { createHash, randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { laToday } from '@/lib/laDate';
import { CrmError } from './events';
import type { FollowupSource, FollowupStatus } from './followups';
import type { TodayAction } from './today/types';
import { buildContactActions } from './today/contactActions';

// ── 分类 ────────────────────────────────────────────────────────────────

export type InquiryCategory = 'customer' | 'pitch' | 'spam';
export type Lang = 'zh' | 'en';
export const CATEGORY_LABEL: Record<InquiryCategory, string> = { customer: '客户咨询', pitch: '合作或推销', spam: '垃圾' };

const CJK = /[㐀-鿿]/g;
/** 按留言判断（留言优先，没留言才看称呼）：有两个以上汉字算中文，否则有英文字母算英文，都没有按中文 */
export function detectLang(...texts: (string | null | undefined)[]): Lang {
  for (const t of texts) {
    if (!t?.trim()) continue;
    const cjk = (t.match(CJK) ?? []).length;
    const latin = (t.match(/[A-Za-z]/g) ?? []).length;
    if (cjk >= 2) return 'zh';
    if (latin >= 3) return 'en';
  }
  return 'zh';
}

const SPAM_RULES: RegExp[] = [
  /\b(casino|viagra|cialis|crypto ?currency|bitcoin|forex|porn|xxx|escort|lottery|jackpot|payday loan|binary option)\b/i,
  /\b(seo (ranking|services?|package)|backlinks?|guest posts?|link building|rank (your|on) google|first page of google)\b/i,
  /(博彩|赌场|色情|代开发票|刷单|网赚|兼职日结|加我微信领取|免费领取|贷款秒批|裸聊)/,
  /[Ѐ-ӿ]{4,}/ // 俄文等
];
const PITCH_RULES: RegExp[] = [
  /\b(we (are|offer|provide|specialize|help)|our (company|firm|agency|team|services?|solutions?|platform)|i represent|on behalf of)\b/i,
  /\b(bookkeeping|accounting (firm|services?|company)|cpa firm|tax (preparation|services?)|payroll services?|marketing (agency|services?)|web ?design|website (design|development)|lead generation|outsourc\w*|virtual assistant|app development|software (solution|development))\b/i,
  /\b(partnership opportunit\w*|business proposal|collaborat\w* opportunit\w*|sponsorship (package|opportunit\w*)|book a (demo|call) with|free (trial|consultation) for your)\b/i,
  /(我们公司|本公司|我司|我们是.{0,12}(公司|事务所|机构|团队)|为您?提供.{0,10}服务|会计(公司|事务所|师事务所|服务)|代账|代理记账|报税服务|网站(建设|设计|开发)|推广服务|营销服务|广告投放|获客服务|诚邀合作|寻求合作|合作机会|招商加盟|代理加盟)/
];
const URLS = /https?:\/\/\S+/gi;

export type Classified = { category: InquiryCategory; lang: Lang; reason: string };

/**
 * 规则分类（不调 AI）。intent 是网站表单的"咨询类型"（加入商会 / 找商会谈项目 / 合作 / 其他）。
 * 垃圾：命中垃圾词、两条以上网址、没有一个字的正文；合作或推销：自我介绍推销服务、表单选"合作"；其余都是客户咨询。
 * 拿不准一律算客户咨询（宁可多跟，不漏真客户）。
 */
export function classifyInquiry(input: { message?: string | null; intent?: string | null; name?: string | null; source?: string | null }): Classified {
  const msg = (input.message ?? '').trim();
  const intent = (input.intent ?? '').trim();
  const all = `${input.name ?? ''} ${intent} ${msg}`;
  const lang = detectLang(msg, input.name);
  if (SPAM_RULES.some((r) => r.test(all))) return { category: 'spam', lang, reason: '内容像广告 / 垃圾信息' };
  if ((msg.match(URLS) ?? []).length >= 2) return { category: 'spam', lang, reason: '留言里有好几个网址' };
  if (msg && !/[A-Za-z㐀-鿿]/.test(msg) && !input.name?.trim()) return { category: 'spam', lang, reason: '留言没有一个字' };
  if (/加入|入会|会员|join|member/i.test(intent)) return { category: 'customer', lang, reason: '想加入商会' };
  if (PITCH_RULES.some((r) => r.test(all))) return { category: 'pitch', lang, reason: '对方在介绍自己的服务' };
  if (/^合作$|partner/i.test(intent) && input.source !== 'agent') return { category: 'pitch', lang, reason: '表单里选的是"合作"' };
  return { category: 'customer', lang, reason: '' };
}

/** 只有新咨询 / AI 助手线索要分类；其他来源（活动后、会员到期、入会申请……）一律算客户 */
export function needsClassify(source: string): boolean {
  return source === 'inquiry' || source === 'agent_lead';
}

// ── 来源标签（四.8）─────────────────────────────────────────────────────

const BASE_LABEL: Record<FollowupSource, string> = {
  agent_lead: 'AI 助手线索',
  post_event_interest: '活动后希望了解',
  inquiry: '新咨询',
  expiring_member: '会员 30 天内到期',
  manual: '手动添加'
};
/** 系统自动生成、但当年写成 source='manual' 的，按 dedupe_key 认出真实来源 */
export function sourceLabel(source: string, dedupeKey?: string | null, inquirySource?: string | null): string {
  const k = dedupeKey ?? '';
  if (source === 'manual') {
    if (k.startsWith('join7:')) return '入会申请 7 天未缴费';
    if (k.startsWith('join:')) return '入会申请';
    if (k.startsWith('cap_full:')) return '报名满员提醒';
    if (k.startsWith('wb_followup:')) return '手机工作台标记要跟进';
    if (!k.startsWith('manual:')) return '系统提醒';
    return '手动添加';
  }
  if (source === 'inquiry' && inquirySource === 'mp') return '小程序咨询';
  if (source === 'inquiry' && inquirySource === 'web_form') return '网站咨询';
  return BASE_LABEL[source as FollowupSource] ?? '其他';
}

// ── 草稿（四.6、一.2）───────────────────────────────────────────────────

export type Voice = 'president' | 'staff';
export type DraftInput = {
  name: string | null;
  lang: Lang;
  isMember: boolean;
  voice: Voice;
  /** 谁来联系（会长 / 工作人员的称呼） */
  by: string;
  overdueDays: number;
  source: string;
  dedupeKey?: string | null;
  need: string | null;
  eventTitle?: string | null;
};

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

export function buildDraft(d: DraftInput): string {
  // 草稿里不整段复述对方原话：活动后只取"希望了解"的内容；咨询只取表单上选的咨询类型（"加入商会"这种短词）
  const raw = (d.need ?? '').replace(/\s+/g, ' ').replace(/^(需求|入会申请（小程序）)[:：]?\s*/, '');
  const needShort =
    d.source === 'post_event_interest'
      ? clip(raw.replace(/^参加「[^」]*」后希望了解[:：]\s*/, ''), 30)
      : d.source === 'inquiry' || d.source === 'agent_lead'
        ? (raw.match(/^([^:：]{2,8})[:：]/)?.[1] ?? (raw.length <= 12 ? raw : ''))
        : clip(raw, 40);
  const k = d.dedupeKey ?? '';
  if (d.lang === 'en') {
    const hi = `Hi ${d.name?.trim() || 'there'},`;
    const me = d.voice === 'president' ? `this is ${d.by}, President of SAREC (Sino-American Real Estate Chamber).` : `this is ${d.by} from SAREC (Sino-American Real Estate Chamber).`;
    const sorry = d.overdueDays > 0 ? ' Sorry for the delay in getting back to you.' : '';
    const mem = d.isMember ? ' Thank you for being a SAREC member — we want to make sure you get the most out of your membership.' : '';
    let body: string;
    if (d.source === 'expiring_member') body = ` Your membership is coming up for renewal soon; happy to help if you have any questions.`;
    else if (d.source === 'post_event_interest') body = ` Thanks for joining us${d.eventTitle ? ` at "${d.eventTitle}"` : ''}. You mentioned you'd like to learn more${needShort ? ` about ${needShort}` : ''} — could we find a time to chat?`;
    else body = ` We received your message${needShort && /^[\x20-\x7e]+$/.test(needShort) ? ` about ${needShort}` : ''} and would love to learn more about what you need. Would you have time for a quick call this week?`;
    return `${hi} ${me}${sorry}${mem}${body}`;
  }
  const who = d.name?.trim() ? `${d.name.trim()}您好，` : '您好，';
  const me = d.voice === 'president' ? `我是 SAREC 中美房地产商会会长${d.by}。` : `我是 SAREC 中美房地产商会的工作人员${d.by}。`;
  const sorry = d.overdueDays > 0 ? '抱歉这么晚才联系您。' : '';
  const mem = d.isMember
    ? d.voice === 'president'
      ? '感谢您作为会员一直支持商会，您的事我们优先安排。'
      : '感谢您作为商会会员一直以来的支持，会长特别交代您的事要优先安排。'
    : '';
  let body: string;
  if (d.source === 'expiring_member') body = '您的会籍快到期了，续费可以在网站"会员"页完成，有任何问题随时找我。';
  else if (d.source === 'post_event_interest') body = `感谢您参加${d.eventTitle ? `「${d.eventTitle}」` : '我们的活动'}。您提到希望了解${needShort || '更多'}，方便的话约个时间聊聊，看看商会能帮上什么忙？`;
  else if (k.startsWith('join7:') || k.startsWith('join:')) body = '收到您的入会申请，想跟您确认一下，缴费或资料上有什么需要我帮忙的吗？';
  else if (d.source === 'manual' && !k.startsWith('manual:') && !k.startsWith('wb_followup:')) body = needShort ? `想跟您跟进一下：${needShort}。` : '想跟您跟进一下。';
  else body = `收到您${needShort ? `关于"${needShort}"` : ''}的咨询，想跟您确认一下具体需求，方便的时候通个电话或约个时间聊聊？`;
  return `${who}${me}${sorry}${mem}${body}`;
}

export function draftSubject(lang: Lang): string {
  return lang === 'en' ? 'Following up on your message – SAREC' : 'SAREC 中美房地产商会回复您的咨询';
}

// ── 团队、会长、助理 ─────────────────────────────────────────────────────

export type TeamMember = { name: string; email: string; roles: string[]; president: boolean; assistant: boolean };

/**
 * 团队成员（在职）。会长：crm_settings.president_email 指定的人；没设时把"管理员"当会长（目前只有东哥是管理员）。
 * 助理：crm_settings.assistant_email 指定的人；没设时取第一个有"运营"权限、不是管理员的在职同事；都没有 = 还没有助理。
 */
export async function teamMembers(): Promise<TeamMember[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ name: string; email: string; roles: string[] }>(
    `SELECT name, email, roles FROM staff_roles WHERE is_active ORDER BY created_at NULLS LAST, name`
  ).catch(() => pool.query<{ name: string; email: string; roles: string[] }>(`SELECT name, email, roles FROM staff_roles WHERE is_active ORDER BY name`));
  const { rows: st } = await pool.query<{ key: string; value: unknown }>(`SELECT key, value FROM crm_settings WHERE key IN ('president_email','assistant_email')`);
  const setting = (k: string) => {
    const v = st.find((x) => x.key === k)?.value;
    return typeof v === 'string' ? v.trim().toLowerCase() : null;
  };
  const pres = setting('president_email');
  const asst = setting('assistant_email');
  const isPres = (m: { email: string; roles: string[] }) => (pres ? m.email.toLowerCase() === pres : m.roles.includes('admin'));
  const assistantEmail =
    asst ?? rows.find((m) => !isPres(m) && !m.roles.includes('admin') && m.roles.includes('ops'))?.email.toLowerCase() ?? null;
  return rows.map((m) => ({ ...m, president: isPres(m), assistant: !!assistantEmail && m.email.toLowerCase() === assistantEmail }));
}

/** 按负责人（名字）决定口气；没负责人就按"现在看的人" */
export function voiceFor(team: TeamMember[], who: string | null | undefined): { voice: Voice; by: string } {
  const m = who ? team.find((x) => x.name === who || x.email.toLowerCase() === who.toLowerCase()) : null;
  if (m) return { voice: m.president ? 'president' : 'staff', by: m.name };
  return { voice: 'staff', by: who || '' };
}

// ── 会员、联系方式、过期 ────────────────────────────────────────────────

export type FollowupCard = {
  id: string;
  source: string;
  sourceLabel: string;
  dedupeKey: string;
  name: string | null;
  need: string | null;
  message: string | null;
  status: FollowupStatus;
  owner: string | null;
  nextDate: string | null;
  createdAt: string;
  contactId: string | null;
  eventTitle: string | null;
  isMember: boolean;
  memberTier: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  category: InquiryCategory;
  categoryBy: string | null;
  categoryReason: string;
  lang: Lang;
  overdueDays: number;
  lastContactAt: string | null;
  lastContactResult: string | null;
  lastContactBy: string | null;
  storedDraft: string | null;
  storedDraftBy: string;
  notifiedAt: string | null;
};

const ACTIVE_APP = ['approved', 'paid', 'second_payment_due'];

/** 读待跟进（带会员身份、联系方式、分类）。ids 指定几条；否则按 where 条件 */
export async function loadCards(f: { ids?: string[]; open?: boolean; limit?: number } = {}): Promise<FollowupCard[]> {
  const today = laToday();
  const { rows } = await getPool().query<{
    id: string; source: string; dedupe_key: string; name: string | null; need: string | null; message: string | null; intent: string | null;
    inq_source: string | null; status: FollowupStatus; owner: string | null; next_date: string | null; created_at: Date; contact_id: string | null;
    event_title: string | null; member_tier: string | null; is_member: boolean; phone: string | null; email: string | null; wechat: string | null;
    contact_text: string | null; category: InquiryCategory | null; category_by: string | null; lang: Lang | null;
    last_contact_at: Date | null; last_contact_result: string | null; last_contact_by: string | null; draft: string | null; draft_by: string;
    notified_at: Date | null;
  }>(
    `WITH f AS (
       SELECT f.*, i.message, i.intent, i.source AS inq_source, i.phone AS i_phone, i.email AS i_email, i.wechat AS i_wechat,
              COALESCE(f.contact_id,
                (SELECT c2.id FROM contacts c2 WHERE (i.phone IS NOT NULL AND c2.phone_e164 = i.phone) OR (i.email IS NOT NULL AND c2.email = lower(i.email)) LIMIT 1)) AS cid
         FROM followups f LEFT JOIN inquiries i ON i.id = f.inquiry_id
        WHERE ($1::uuid[] IS NULL OR f.id = ANY($1::uuid[]))
          AND (NOT $2::boolean OR f.status IN ('todo','contacted','meeting'))
        ORDER BY f.created_at DESC LIMIT $3
     )
     SELECT f.id, f.source, f.dedupe_key, f.name, f.need, f.message, f.intent, f.inq_source, f.status, f.owner, f.next_date::text AS next_date,
            f.created_at, f.cid AS contact_id, e.title AS event_title, f.contact_text, f.category, f.category_by, f.lang,
            f.last_contact_at, f.last_contact_result, f.last_contact_by, f.draft, f.draft_by, f.notified_at,
            COALESCE(f.i_phone, c.phone_e164) AS phone, COALESCE(f.i_email, c.email) AS email,
            COALESCE(f.i_wechat, (SELECT mc.wechat_id FROM member_cards mc WHERE mc.contact_id = c.id)) AS wechat,
            m.tier AS member_tier, (m.tier IS NOT NULL) AS is_member
       FROM f
       LEFT JOIN contacts c ON c.id = f.cid
       LEFT JOIN events e ON e.id = f.event_id
       LEFT JOIN LATERAL (
         SELECT COALESCE(t.name_zh, a.selected_tier_slug, '会员') AS tier FROM applications a LEFT JOIN membership_tiers t ON t.slug = a.selected_tier_slug
          WHERE a.contact_id = f.cid AND a.membership_end_date >= $4::date
            AND (a.application_status = ANY($5) OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))
          ORDER BY a.membership_end_date DESC LIMIT 1
       ) m ON true
      ORDER BY f.created_at DESC`,
    [f.ids ?? null, f.open ?? false, f.limit ?? 300, today, ACTIVE_APP]
  );
  return rows.map((r) => {
    const ct = r.contact_text ?? '';
    const phone = r.phone ?? ct.match(/\+?\d[\d\s().-]{8,}\d/)?.[0]?.replace(/[^\d+]/g, '') ?? null;
    const email = r.email ?? ct.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
    const wechat = r.wechat ?? ct.match(/微信\s*[:：]?\s*([\w-]{5,})/)?.[1] ?? null;
    const text = r.message ?? r.need ?? '';
    const auto = needsClassify(r.source) ? classifyInquiry({ message: text, intent: r.intent, name: r.name, source: r.inq_source }) : { category: 'customer' as const, lang: detectLang(text, r.name), reason: '' };
    const overdueDays = r.next_date && r.next_date < today && ['todo', 'contacted', 'meeting'].includes(r.status) ? Math.round((Date.parse(today) - Date.parse(r.next_date)) / 86400_000) : 0;
    return {
      id: r.id,
      source: r.source,
      sourceLabel: sourceLabel(r.source, r.dedupe_key, r.inq_source),
      dedupeKey: r.dedupe_key,
      name: r.name,
      need: r.need,
      message: r.message,
      status: r.status,
      owner: r.owner,
      nextDate: r.next_date,
      createdAt: r.created_at.toISOString(),
      contactId: r.contact_id,
      eventTitle: r.event_title,
      isMember: r.is_member,
      memberTier: r.member_tier,
      phone,
      email,
      wechat,
      category: r.category ?? auto.category,
      categoryBy: r.category_by ?? (needsClassify(r.source) ? 'rule' : null),
      categoryReason: r.category ? (r.category_by === 'staff' ? '工作人员改过' : auto.reason) : auto.reason,
      lang: r.lang ?? auto.lang,
      overdueDays,
      lastContactAt: r.last_contact_at?.toISOString() ?? null,
      lastContactResult: r.last_contact_result,
      lastContactBy: r.last_contact_by,
      storedDraft: r.draft,
      storedDraftBy: r.draft_by,
      notifiedAt: r.notified_at?.toISOString() ?? null
    };
  });
}

export function draftFor(c: FollowupCard, v: { voice: Voice; by: string }): string | null {
  if (c.category !== 'customer') return null; // 四.1：只有客户咨询生成建议联系内容
  return buildDraft({ name: c.name, lang: c.lang, isMember: c.isMember, voice: v.voice, by: v.by, overdueDays: c.overdueDays, source: c.source, dedupeKey: c.dedupeKey, need: c.need, eventTitle: c.eventTitle });
}

/** 联系按钮（四.4）：打电话、发短信（带草稿）、发邮件（带草稿，只打开邮件程序）、复制微信号、复制手机号加微信（全站同一套，见 ./today/contactActions.ts） */
export function contactActions(c: FollowupCard, draft: string | null): TodayAction[] {
  return buildContactActions({ phone: c.phone, email: c.email, wechat: c.wechat, smsDraft: draft ?? '', emailSubject: draftSubject(c.lang), emailDraft: draft ?? '' });
}

// ── 动作：联系回填、不跟进、我来联系、转给助理、改分类 ──────────────────────

const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400_000).toISOString().slice(0, 10);

async function writeLog(id: string, actor: string, from: string, to: string, note: string) {
  await getPool().query(`INSERT INTO followup_log (followup_id, actor, from_status, to_status, note) VALUES ($1, $2, $3, $4, $5)`, [id, actor, from, to, note.slice(0, 1000)]);
}
async function current(id: string): Promise<{ status: FollowupStatus; owner: string | null }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new CrmError('not_found', '找不到这条跟进');
  const { rows } = await getPool().query<{ status: FollowupStatus; owner: string | null }>(`SELECT status, owner FROM followups WHERE id = $1`, [id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这条跟进');
  return rows[0];
}

export type ContactResult = 'reached' | 'no_answer' | 'scheduled';
export const RESULT_LABEL: Record<ContactResult, string> = { reached: '联系上了', no_answer: '没接', scheduled: '已约时间' };

/**
 * 四.5 联系回填：
 *  联系上了 → 状态"已联系"，下一步日期清空；没接 → 状态不变，下一步改明天；已约时间 → 状态"已约谈"，下一步 = 约的日期（默认明天）。
 *  都记时间、谁联系的，写进处理记录；没负责人的顺手记成联系的人。
 */
export async function recordContactResult(actor: string, staffName: string, id: string, result: string, date?: string | null) {
  if (!['reached', 'no_answer', 'scheduled'].includes(result)) throw new CrmError('bad_request', '请选：联系上了 / 没接 / 已约时间');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new CrmError('bad_request', '日期格式应为 YYYY-MM-DD');
  const cur = await current(id);
  const today = laToday();
  const r = result as ContactResult;
  const to: FollowupStatus = r === 'reached' ? (cur.status === 'meeting' ? 'meeting' : 'contacted') : r === 'scheduled' ? 'meeting' : cur.status;
  const next = r === 'reached' ? null : r === 'no_answer' ? addDays(today, 1) : date || addDays(today, 1);
  await getPool().query(
    `UPDATE followups SET status = $2, next_date = $3::date, last_contact_at = now(), last_contact_result = $4, last_contact_by = $5,
            owner = COALESCE(owner, NULLIF($5, '')), updated_at = now() WHERE id = $1`,
    [id, to, next, r, staffName]
  );
  await writeLog(id, actor, cur.status, to, `${RESULT_LABEL[r]}${next ? `，下一步 ${next}` : ''}`);
  return { status: to, nextDate: next, message: r === 'reached' ? '已记"联系上了"' : r === 'no_answer' ? '已记"没接"，明天再提醒' : `已记"已约时间"：${next}` };
}

export type QuickAction = 'drop' | 'claim' | 'assist';
/** 四.2 三个按钮：不跟进 / 我来联系 / 转给助理（点了直接生效；重复点不会出错） */
export async function quickAction(actor: string, staffName: string, id: string, action: string) {
  const cur = await current(id);
  const pool = getPool();
  if (action === 'drop') {
    if (cur.status === 'dropped') return { message: '这条已经是"不跟进"了' };
    await pool.query(`UPDATE followups SET status = 'dropped', updated_at = now() WHERE id = $1`, [id]);
    await writeLog(id, actor, cur.status, 'dropped', '不跟进');
    return { message: '已标为不跟进' };
  }
  if (action === 'claim') {
    await pool.query(`UPDATE followups SET owner = $2, next_date = COALESCE(LEAST(next_date, $3::date), $3::date), status = CASE WHEN status = 'dropped' THEN 'todo' ELSE status END, updated_at = now() WHERE id = $1`, [id, staffName, laToday()]);
    await writeLog(id, actor, cur.status, cur.status === 'dropped' ? 'todo' : cur.status, `我来联系（${staffName}）`);
    return { message: `已记在您名下（${staffName}），今天联系` };
  }
  if (action === 'assist') {
    const asst = (await teamMembers()).find((m) => m.assistant);
    if (!asst) throw new CrmError('no_assistant', '团队里还没有助理：请先在「团队」里加一位有"运营"权限的同事，或在设置里指定助理');
    await pool.query(`UPDATE followups SET owner = $2, next_date = COALESCE(LEAST(next_date, $3::date), $3::date), status = CASE WHEN status = 'dropped' THEN 'todo' ELSE status END, updated_at = now() WHERE id = $1`, [id, asst.name, laToday()]);
    await writeLog(id, actor, cur.status, cur.status === 'dropped' ? 'todo' : cur.status, `转给助理（${asst.name}）`);
    return { message: `已转给助理 ${asst.name}` };
  }
  throw new CrmError('bad_request', '不支持的操作');
}

/** 工作人员改分类（分错了一键改）；改成推销 / 垃圾时顺手标"不跟进" */
export async function setCategory(actor: string, id: string, category: string) {
  if (!['customer', 'pitch', 'spam'].includes(category)) throw new CrmError('bad_request', '分类不对');
  const cur = await current(id);
  await getPool().query(`UPDATE followups SET category = $2, category_by = 'staff', updated_at = now() WHERE id = $1`, [id, category]);
  await writeLog(id, actor, cur.status, cur.status, `改分类为「${CATEGORY_LABEL[category as InquiryCategory]}」`);
  return { message: `已改为「${CATEGORY_LABEL[category as InquiryCategory]}」` };
}

/** 一键把一批推销 / 垃圾标为不跟进（只动仍在"待联系"、且确实是推销或垃圾的） */
export async function dropJunk(actor: string, ids?: string[] | null): Promise<{ dropped: number }> {
  const cards = (await loadCards({ ids: ids ?? undefined, open: true, limit: 500 })).filter((c) => c.status === 'todo' && c.category !== 'customer');
  const pool = getPool();
  let dropped = 0;
  for (const c of cards) {
    const { rowCount } = await pool.query(`UPDATE followups SET status = 'dropped', category = COALESCE(category, $2), category_by = COALESCE(category_by, 'rule'), updated_at = now() WHERE id = $1 AND status = 'todo'`, [c.id, c.category]);
    if (rowCount) {
      dropped++;
      await writeLog(c.id, actor, 'todo', 'dropped', `${CATEGORY_LABEL[c.category]}，一键全部不跟进`);
    }
  }
  return { dropped };
}

// ── 邮件按钮口令（四.2）──────────────────────────────────────────────────

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const TOKEN_DAYS = 30;

/** 给一条跟进发一个新口令（每封通知邮件一个），库里只存 sha256，30 天有效 */
export async function issueActionToken(id: string): Promise<string> {
  const t = randomBytes(18).toString('base64url');
  await getPool().query(`UPDATE followups SET action_token_hash = $2, action_token_expires = now() + make_interval(days => $3) WHERE id = $1`, [id, sha(t), TOKEN_DAYS]);
  return t;
}
export async function checkActionToken(id: string, token: string | null | undefined): Promise<boolean> {
  if (!token || token.length < 16 || !/^[0-9a-f-]{36}$/i.test(id)) return false;
  const { rows } = await getPool().query(`SELECT 1 FROM followups WHERE id = $1 AND action_token_hash = $2 AND action_token_expires > now()`, [id, sha(token)]);
  return !!rows[0];
}

export async function issueBatch(ids: string[]): Promise<{ id: string; token: string }> {
  const t = randomBytes(18).toString('base64url');
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO followup_batches (ids, token_hash, expires_at) VALUES ($1::uuid[], $2, now() + make_interval(days => $3)) RETURNING id`,
    [ids, sha(t), TOKEN_DAYS]
  );
  return { id: rows[0].id, token: t };
}
export async function batchIds(batchId: string, token: string | null | undefined): Promise<string[] | null> {
  if (!token || !/^[0-9a-f-]{36}$/i.test(batchId)) return null;
  const { rows } = await getPool().query<{ ids: string[] }>(`SELECT ids FROM followup_batches WHERE id = $1 AND token_hash = $2 AND expires_at > now()`, [batchId, sha(token)]);
  return rows[0]?.ids ?? null;
}
export async function markBatchDone(batchId: string, by: string) {
  await getPool().query(`UPDATE followup_batches SET done_at = COALESCE(done_at, now()), done_by = COALESCE(done_by, $2) WHERE id = $1`, [batchId, by]);
}
