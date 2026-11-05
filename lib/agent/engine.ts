/**
 * AI 助手 —— 一条访客消息的完整处理（唯一会调用模型的地方）。
 * ------------------------------------------------------------------
 * 顺序：机器人拦截 → 限流 / 可疑（降速 + 人机验证）→ 身份 → 边界固定回复 → 报名 / 入会意图
 *      → 第 0 级常见问题库 → 24 小时答案缓存 → 预算与身份决定能否调模型 → 第 1 级 / 第 2 级 → 兜底。
 * 动作（报名 / 线索 / 入会）只作为“确认卡片”返回；访客点击确认后由前端调用对应接口提交。
 */
import { randomBytes } from 'node:crypto';
import { optionalContact } from '@/lib/crm/http';
import { LIMITS, MAX_OUTPUT_TOKENS, isMockMode, turnstileConfigured } from './config';
import { budgetState, maybeSendBudgetAlert, type BudgetState } from './budget';
import { getIndex, eventLine, type UpcomingEvent } from './knowledge';
import type { Hit } from './bm25';
import { matchFaq, nextEventText, renderFaq } from './faq';
import {
  asksInvestmentReturn,
  asksLegalTax,
  asksSendOnBehalf,
  boundaryReply,
  extractLeadSlots,
  hasContact,
  isLeadIntent,
  leadNextStep,
  leadQuestion,
  mergeLead,
  wantsJoin,
  wantsRegister,
  type LeadInfo,
  type LeadStep
} from './intent';
import { SUMMARY_PROMPT, SYSTEM_PROMPT, contextBlock, parseModelOutput, type ModelOutput } from './prompt';
import { callModel, providerAvailable, type Turn } from './providers';
import { assess, clientIp, ipHash, isVerified, loadRows, saveRow, verifyTurnstile, type Suspicion } from './guard';
import {
  activeFaqs,
  addMessage,
  audienceFor,
  bumpDaily,
  cacheGet,
  cacheSet,
  createConversation,
  faqHit,
  getConversation,
  messagesAfter,
  upcomingEvents,
  updateConversation,
  type Audience,
  type Conversation
} from './store';
import { clip, detectLang, extractEmail, extractPhone, isBotUserAgent, laDay, looksMeaningless, normalizeTight, sha256 } from './text';

export const VISITOR_COOKIE = 'sarec_av';

export type PageContext = { page: 'home' | 'article' | 'event'; slug?: string; title?: string };

export type ChatRequest = {
  message?: unknown;
  conversationId?: unknown;
  context?: unknown;
  turnstileToken?: unknown;
  /** 蜜罐：页面上隐藏的输入框，真人不会填 */
  website?: unknown;
};

export type AgentAction =
  | { type: 'register'; slug: string; title: string; when: string; loggedIn: boolean }
  | { type: 'lead'; lead: LeadInfo }
  | { type: 'join'; href: string; label: string };

export type ChatResult = {
  status: number;
  body: {
    ok: boolean;
    reply?: string;
    tier?: 0 | 1 | 2 | null;
    route?: string;
    actions?: AgentAction[];
    conversationId?: string;
    needTurnstile?: boolean;
    retryAfter?: number;
    error?: { code: string; message: string };
  };
  visitorId: string;
  newVisitor: boolean;
};

const FALLBACK_CONTACT_ZH = '这个问题我这边暂时没法详细回答。您可以留下联系方式（手机、邮箱或微信），工作人员会尽快回复您；也可以直接发邮件到 info@sinoamericanrec.org。';
const FALLBACK_CONTACT_EN = 'I am not able to answer this in detail right now. Please leave your contact (phone, email or WeChat) and a colleague will get back to you soon — or email info@sinoamericanrec.org.';
const LIMIT_ZH = '今天的在线提问次数已经用完了。常见问题我还可以回答；其他问题请留下联系方式，工作人员会尽快回复您。登录后提问不限条数。';
const LIMIT_EN = 'You have reached today’s limit for online questions. I can still answer common questions; for anything else, please leave your contact and a colleague will reply soon. Signed-in users have no limit.';

const fallbackText = (lang: 'zh' | 'en') => (lang === 'en' ? FALLBACK_CONTACT_EN : FALLBACK_CONTACT_ZH);

function parseContext(v: unknown): PageContext | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const page = o.page === 'article' || o.page === 'event' || o.page === 'home' ? o.page : null;
  if (!page) return null;
  return {
    page,
    slug: typeof o.slug === 'string' ? o.slug.slice(0, 200) : undefined,
    title: typeof o.title === 'string' ? o.title.slice(0, 200) : undefined
  };
}

/** 回答长度上限 + 安全网：回答里出现具体回报数字时，换成固定拒答。 */
export function finalizeReply(reply: string, lang: 'zh' | 'en'): string {
  let r = reply.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
  if (/(年化|回报|收益|分红|irr|roi|yield|returns?\b)[^\d\n]{0,8}\d+(\.\d+)?\s*(%|％|个点)/i.test(r)) r = boundaryReply('returns', lang);
  const max = lang === 'en' ? 1100 : LIMITS.replyZhChars;
  if (r.length > max) r = clip(r, max);
  return r;
}

function pickEvent(message: string, ctx: PageContext | null, events: UpcomingEvent[]): UpcomingEvent | 'many' | null {
  const open = events.filter((e) => e.registrationOpen);
  const t = normalizeTight(message);
  const byTitle = open.find((e) => t.includes(normalizeTight(e.title).slice(0, 6)) || t.includes(e.slug.toLowerCase()));
  if (ctx?.page === 'event' && ctx.slug) {
    const e = open.find((x) => x.slug === ctx.slug) ?? (ctx.title ? open.find((x) => normalizeTight(x.title) === normalizeTight(ctx.title as string)) : undefined);
    // 在某场活动页上说“帮我报名”：只报这一场；这一场不能在线报名时不替换成别的活动
    return e ?? byTitle ?? null;
  }
  if (byTitle) return byTitle;
  if (open.length === 1) return open[0];
  return open.length > 1 ? 'many' : null;
}

function registerAction(e: UpcomingEvent, loggedIn: boolean, lang: 'zh' | 'en'): AgentAction {
  return { type: 'register', slug: e.slug, title: e.title, when: eventLine(e, lang), loggedIn };
}

const joinAction = (lang: 'zh' | 'en'): AgentAction => ({ type: 'join', href: '/zh/join#apply', label: lang === 'en' ? 'Go to membership application' : '前往入会页' });
const leadAction = (lead: LeadInfo): AgentAction => ({ type: 'lead', lead: publicLead(lead) });

function publicLead(l: LeadInfo): LeadInfo {
  return { need: l.need ?? '', region: l.region ?? '', timeline: l.timeline ?? '', wantsCall: l.wantsCall ?? null, name: l.name ?? '', phone: l.phone ?? '', email: l.email ?? '', wechat: l.wechat ?? '' };
}

/** 模拟模式的“模型输出”（规则生成，确定性）。 */
function mockOutput(o: { lang: 'zh' | 'en'; hits: Hit[]; inLead: boolean; lead: LeadInfo; next: LeadStep; tier: 1 | 2 }): string {
  let reply: string;
  let action: ModelOutput['action'] = 'none';
  const tag = o.lang === 'en' ? `(mock tier ${o.tier}) ` : `（模拟第 ${o.tier} 级）`;
  if (o.inLead) {
    reply = tag + leadQuestion(o.next, o.lang);
    if (o.next === 'ready') action = 'lead';
  } else if (o.hits[0]) {
    const h = o.hits[0];
    reply = `${tag}${o.lang === 'en' ? 'From ' : '根据'}「${h.title}」：${clip(h.text.replace(/\s+/g, ' '), 160)}${h.url ? `\n${o.lang === 'en' ? 'More' : '详情'}：${h.url}` : ''}`;
  } else {
    reply = tag + (o.lang === 'en' ? 'I do not have accurate information on this. Leave your contact and a colleague will follow up.' : '这个我这里没有准确信息。可以留下联系方式，我请同事跟进。');
  }
  const l = o.lead;
  const out: ModelOutput = {
    reply,
    lang: o.lang,
    intent: o.inLead ? 'lead' : 'other',
    lead: { need: l.need ?? '', region: l.region ?? '', timeline: l.timeline ?? '', wantsCall: l.wantsCall === true ? 'yes' : l.wantsCall === false ? 'no' : 'unknown', name: l.name ?? '', phone: l.phone ?? '', email: l.email ?? '', wechat: l.wechat ?? '' },
    action,
    eventSlug: ''
  };
  return JSON.stringify(out);
}

type Answer = {
  reply: string;
  tier: 0 | 1 | 2;
  route: string;
  model?: string | null;
  usage?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
  costMicros?: number;
  cached?: boolean;
  faqId?: number | null;
  intent?: string | null;
  actions: AgentAction[];
};

export async function handleChat(req: Request, b: ChatRequest, cookieVisitor: string | undefined): Promise<ChatResult> {
  const now = new Date();
  const day = laDay(now);
  const newVisitor = !cookieVisitor || !/^[a-f0-9]{32}$/.test(cookieVisitor);
  const visitorId = newVisitor ? randomBytes(16).toString('hex') : (cookieVisitor as string);
  const res = (status: number, body: ChatResult['body']): ChatResult => ({ status, body, visitorId, newVisitor });
  const ua = req.headers.get('user-agent');
  const ip = clientIp(req);
  const ipH = ipHash(ip, day);

  // ── 1. 确认机器人：直接拦截，不调模型 ──
  if ((typeof b.website === 'string' && b.website.trim()) || isBotUserAgent(ua)) {
    await bumpDaily({ blocked: 1 });
    return res(403, { ok: false, error: { code: 'blocked', message: '请求被拦截' } });
  }
  const message = typeof b.message === 'string' ? b.message.replace(/\u0000/g, '').trim() : '';
  if (!message) return res(400, { ok: false, error: { code: 'bad_request', message: '请输入问题' } });
  if (message.length > LIMITS.hardMax) return res(400, { ok: false, error: { code: 'too_long', message: '内容太长了，请精简到 1500 字以内，或留下联系方式由同事跟进。' } });

  // ── 2. 限流与可疑判断 ──
  const keys = [`v:${visitorId}`, ...(ipH ? [`ip:${ipH}`] : [])];
  let rows = await loadRows(keys, day);
  const convIdIn = typeof b.conversationId === 'string' ? b.conversationId : null;
  if (rows.some((r) => r.blocked)) {
    await bumpDaily({ blocked: 1 });
    return res(403, { ok: false, error: { code: 'blocked', message: '请求被拦截' } });
  }
  const tsOn = turnstileConfigured();
  if (typeof b.turnstileToken === 'string' && b.turnstileToken) {
    const passed = await verifyTurnstile(b.turnstileToken, ip);
    rows = rows.map((r) =>
      passed
        ? { ...r, verified_until: new Date(now.getTime() + LIMITS.verifiedMinutes * 60_000), strikes: 0, repeat_count: 0, burst_count: 0, burst_start: null, turnstile_fails: 0 }
        : { ...r, turnstile_fails: r.turnstile_fails + 1, blocked: r.turnstile_fails + 1 >= LIMITS.turnstileFailsToBlock }
    );
    if (!passed) {
      for (const r of rows) await saveRow(r, day);
      if (rows.some((r) => r.blocked)) {
        await bumpDaily({ blocked: 1 });
        return res(403, { ok: false, error: { code: 'blocked', message: '人机验证多次未通过，请稍后再试' } });
      }
      await bumpDaily({ slowed: 1 });
      return res(429, { ok: true, reply: '人机验证没有通过，请再试一次。', tier: null, needTurnstile: true, retryAfter: 0, conversationId: convIdIn ?? undefined });
    }
  }
  const msgHash = sha256(normalizeTight(message)).slice(0, 16);
  const meaningless = looksMeaningless(message);
  const long = message.length > LIMITS.longPaste;
  const assessed = rows.map((r) => assess(r, now, msgHash, { meaningless, long }));
  const reasons: Suspicion[] = [];
  assessed.forEach((a) => a.reasons.forEach((x) => reasons.indexOf(x) < 0 && reasons.push(x)));
  const verified = rows.some((r) => isVerified(r, now));
  const hard = reasons.includes('burst') || reasons.includes('interval');
  const soft = reasons.includes('repeat') || reasons.includes('meaningless') || reasons.includes('long');
  if ((hard && !(verified && !reasons.includes('burst'))) || (soft && tsOn && !verified)) {
    const strikes = Math.max(...assessed.map((a) => a.row.strikes)) + 1;
    for (const a of assessed) await saveRow({ ...a.row, strikes }, day);
    await bumpDaily({ slowed: 1 });
    const needTurnstile = tsOn && !verified;
    const retryAfter = hard ? Math.min(60, 3 + strikes * 3) : 0;
    return res(429, {
      ok: true,
      reply: needTurnstile ? '为了确认您不是机器人，请先完成下面的人机验证，再继续提问。' : `您发得有点快，请 ${retryAfter} 秒后再试。`,
      tier: null,
      route: 'slow',
      needTurnstile,
      retryAfter,
      conversationId: convIdIn ?? undefined
    });
  }
  const counted = assessed.map((a) => ({ ...a.row, count: a.row.count + 1, strikes: soft ? a.row.strikes + 1 : a.row.strikes }));
  for (const r of counted) await saveRow(r, day);

  // ── 3. 身份与对话 ──
  const contactId = await optionalContact(req).catch(() => null);
  const who = await audienceFor(contactId);
  const audience: Audience = who.audience;
  const trusted = audience !== 'visitor';
  const overLimit = !trusted && Math.max(...counted.map((r) => r.count)) > LIMITS.visitorDaily;
  const lang = detectLang(message);
  const ctx = parseContext(b.context);
  let conv: Conversation | null = convIdIn ? await getConversation(convIdIn, visitorId) : null;
  if (!conv) conv = await createConversation({ visitorId, contactId, ipHash: ipH, userAgent: ua, page: ctx, lang, audience });
  const firstQuestion = conv.turns === 0;
  const text = long ? message.slice(0, LIMITS.longPaste) : message;
  const flags: string[] = [...reasons];
  if (overLimit) flags.push('over_limit');
  await addMessage({ conversationId: conv.id, role: 'user', content: text, flags });

  const [events, faqs] = await Promise.all([upcomingEvents(), activeFaqs().catch(() => [])]);

  // 线索状态
  const prevLead: LeadInfo & { _pending?: string | null } = conv.lead_info ?? {};
  const pending = (prevLead._pending ?? null) as LeadStep | null;
  const leadNow = isLeadIntent(text);
  let inLead = conv.is_lead || leadNow;
  let lead: LeadInfo = { ...prevLead };
  delete (lead as { _pending?: unknown })._pending;
  if (inLead || extractEmail(text) || extractPhone(text)) lead = mergeLead(lead, extractLeadSlots(text, inLead ? pending : null, lead));
  const leadSubmitted = !!conv.lead_at;

  // ── 4. 决定怎么答 ──
  let answer: Answer | null = null;
  let budget: BudgetState | null = null;

  const leadTail = () => {
    if (!inLead || leadSubmitted) return '';
    const step = leadNextStep(lead);
    return '\n\n' + leadQuestion(step, lang);
  };

  if (meaningless) {
    answer = { reply: lang === 'en' ? 'Sorry, I did not quite catch that. You can ask about events, membership, or a project you would like to discuss.' : '抱歉，没太看懂。可以问我活动、入会，或者您想找商会聊的项目。', tier: 0, route: 'meaningless', actions: [] };
  } else if (reasons.includes('repeat')) {
    answer = { reply: lang === 'en' ? 'I answered this just above. If something is unclear, tell me which part and I will explain, or leave your contact for a colleague.' : '这个问题刚才已经回答过了。哪里不清楚可以具体说说，或者留下联系方式，我请同事跟进。', tier: 0, route: 'repeat', actions: [] };
  } else if (asksSendOnBehalf(text)) {
    answer = { reply: boundaryReply('on_behalf', lang) + leadTail(), tier: 0, route: 'boundary', intent: 'boundary', actions: [] };
  } else if (asksLegalTax(text)) {
    answer = { reply: boundaryReply('legal_tax', lang) + leadTail(), tier: 0, route: 'boundary', intent: 'boundary', actions: [] };
  } else if (asksInvestmentReturn(text)) {
    answer = { reply: boundaryReply('returns', lang) + leadTail(), tier: 0, route: 'boundary', intent: 'boundary', actions: [] };
  } else if (wantsRegister(text) && !inLead) {
    const e = pickEvent(text, ctx, events);
    if (e === 'many') {
      answer = {
        reply: (lang === 'en' ? 'Which event would you like to join?\n' : '想报名哪一场？\n') + events.filter((x) => x.registrationOpen).map((x) => '· ' + eventLine(x, lang)).join('\n'),
        tier: 0,
        route: 'register',
        intent: 'event',
        actions: []
      };
    } else if (e) {
      answer = {
        reply: lang === 'en' ? `Sure — please check and confirm the registration card below for 「${e.title}」. Nothing is submitted until you confirm.` : `好的，请确认下面「${e.title}」的报名卡片，您确认后才会提交。`,
        tier: 0,
        route: 'register',
        intent: 'event',
        actions: [registerAction(e, !!contactId, lang)]
      };
    } else {
      const onEventPage = ctx?.page === 'event';
      answer = {
        reply: onEventPage
          ? lang === 'en'
            ? 'Online registration for this event is not available through me. Please check the registration details on this page, or leave your contact and a colleague will help.'
            : '这场活动暂时不能在这里报名，请看本页的报名说明；也可以留下联系方式，同事帮您安排。'
          : nextEventText(events, lang) + (lang === 'en' ? '\nRegistration is not open for any event right now.' : '\n目前没有开放报名的活动。'),
        tier: 0,
        route: 'register',
        intent: 'event',
        actions: []
      };
    }
  } else if (wantsJoin(text) && !inLead) {
    const f = faqs.find((x) => x.intent === 'how_join');
    answer = { reply: f ? renderFaq(f, lang, events) : lang === 'en' ? 'You can apply online at /zh/join.' : '入会在线申请：/zh/join', tier: 0, route: 'faq', faqId: f?.id ?? null, intent: 'membership', actions: [joinAction(lang)] };
    if (f) await faqHit(f.id);
  } else if (!inLead) {
    const m = matchFaq(text, faqs);
    if (m) {
      answer = { reply: renderFaq(m.faq, lang, events), tier: 0, route: 'faq', faqId: m.faq.id, intent: m.faq.intent, actions: m.faq.intent === 'how_join' ? [joinAction(lang)] : [] };
      await faqHit(m.faq.id);
    }
  }

  // 24 小时答案缓存：只缓存“对话第一句、非线索、无动作”的问题
  const cacheable = firstQuestion && !inLead && !answer;
  const cacheKey = cacheable ? sha256(`${lang}|${audience === 'member' ? 'm' : 'v'}|${normalizeTight(text)}`) : null;
  if (!answer && cacheKey) {
    const c = await cacheGet(cacheKey).catch(() => null);
    if (c) answer = { reply: c.reply, tier: (c.tier as 1 | 2) ?? 1, route: 'cache', model: c.model, cached: true, actions: [] };
  }

  // ── 5. 需要模型：预算 + 身份 + 条数决定能不能调 ──
  let summaryCost = 0;
  let summaryModelCalls = 0;
  if (!answer) {
    budget = await budgetState(now).catch(() => null);
    if (budget) await maybeSendBudgetAlert(budget, now).catch(() => undefined);
    let tier: 1 | 2 = inLead || audience === 'member' ? 2 : 1;
    let allowed = !overLimit;
    if (budget?.level === 'stop') allowed = false;
    if (budget?.level === 'restrict' && !(audience === 'member' || inLead)) allowed = false;
    if (allowed && !providerAvailable(tier)) {
      if (tier === 2 && providerAvailable(1)) tier = 1;
      else allowed = false;
    }
    const nextStep = leadNextStep(lead);
    if (!allowed) {
      if (inLead && !leadSubmitted) {
        answer = { reply: leadQuestion(nextStep, lang), tier: 0, route: 'lead_rule', intent: 'lead', actions: nextStep === 'ready' ? [leadAction(lead)] : [] };
      } else {
        answer = {
          reply: overLimit ? (lang === 'en' ? LIMIT_EN : LIMIT_ZH) : fallbackText(lang),
          tier: 0,
          route: overLimit ? 'limit' : budget && budget.level !== 'ok' && budget.level !== 'warn' ? 'budget' : 'fallback',
          actions: []
        };
      }
    } else {
      // 检索：本句 + 上一句访客问题（追问时补上下文）
      const index = getIndex(events, faqs);
      const history = await messagesAfter(conv.id, conv.summarized_until);
      const prior = history.slice(0, -1); // 去掉刚存的本句
      const lastUser = [...prior].reverse().find((m) => m.role === 'user')?.content ?? '';
      // 先只用本句检索；本句太短或没检索到像样的内容时（追问），再带上上一句
      let hits = index.search(text, LIMITS.chunks);
      if (lastUser && text.length < 25 && (!hits.length || hits[0].score < 4)) hits = index.search(`${text} ${lastUser}`, LIMITS.chunks);

      // 超过 6 轮：把较早的对话压缩成摘要
      let summary = conv.summary;
      let recent = prior;
      const userTurns = prior.filter((m) => m.role === 'user').length;
      if (userTurns >= LIMITS.summarizeAfterTurns) {
        const keepFrom = (() => {
          let n = 0;
          for (let i = prior.length - 1; i >= 0; i--) {
            if (prior[i].role === 'user' && ++n === LIMITS.keepRecentTurns) return i;
          }
          return 0;
        })();
        const older = prior.slice(0, keepFrom);
        recent = prior.slice(keepFrom);
        if (older.length) {
          const transcript = (summary ? `【已有摘要】${summary}\n` : '') + older.map((m) => `${m.role === 'user' ? '访客' : '助手'}：${clip(m.content, 300)}`).join('\n');
          let newSummary = '';
          if (providerAvailable(1) && !isMockMode()) {
            const s = await callModel({ tier: 1, system: SUMMARY_PROMPT, history: [], user: transcript, maxTokens: MAX_OUTPUT_TOKENS.summary, json: false });
            summaryCost += s.costMicros;
            summaryModelCalls++;
            if (s.ok) newSummary = clip(s.text, 400);
          }
          if (!newSummary) {
            const qs = older.filter((m) => m.role === 'user').map((m) => clip(m.content, 40));
            newSummary = clip(`${summary ? summary + '；' : ''}访客先后问了：${qs.join('；')}`, 400);
          }
          summary = newSummary;
          await updateConversation(conv.id, { summary, summarizedUntil: older[older.length - 1].id });
        }
      }

      const historyTurns: Turn[] = recent.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: m.content }));
      const block = contextBlock({
        today: day,
        page: ctx,
        audience,
        memberName: who.name,
        events: events.map((e) => `- slug=${e.slug}｜${eventLine(e, 'zh')}｜${e.registrationOpen ? '开放报名' : '暂未开放报名'}`),
        hits,
        summary,
        lead: inLead && !leadSubmitted ? { info: lead, next: nextStep } : null,
        hint: leadSubmitted ? '这位访客的线索已经提交过，不要再请对方提交卡片。' : null
      });
      const user = `${block}\n\n【访客消息】\n${text}`;
      const r = await callModel({
        tier,
        system: SYSTEM_PROMPT,
        history: historyTurns,
        user,
        maxTokens: tier === 2 ? MAX_OUTPUT_TOKENS.tier2 : MAX_OUTPUT_TOKENS.tier1,
        json: true,
        mockText: isMockMode() ? mockOutput({ lang, hits, inLead: inLead && !leadSubmitted, lead, next: nextStep, tier }) : undefined
      });
      const out = r.ok ? parseModelOutput(r.text) : null;
      const actions: AgentAction[] = [];
      let reply: string;
      if (!out) {
        reply = inLead && !leadSubmitted ? leadQuestion(nextStep, lang) : fallbackText(lang);
      } else {
        reply = out.reply;
        if (out.intent === 'lead') inLead = true;
        if (inLead) {
          const ml = out.lead;
          const extra: LeadInfo = {
            need: ml.need || undefined,
            region: ml.region || undefined,
            timeline: ml.timeline || undefined,
            name: ml.name || undefined,
            phone: ml.phone ? extractPhone(ml.phone) ?? undefined : undefined,
            email: ml.email ? extractEmail(ml.email) ?? undefined : undefined,
            wechat: ml.wechat && /^[A-Za-z][A-Za-z0-9_\-]{5,19}$/.test(ml.wechat) ? ml.wechat : undefined,
            wantsCall: ml.wantsCall === 'yes' ? true : ml.wantsCall === 'no' ? false : undefined
          };
          // 规则提取的优先（模型可能“脑补”），模型只补空缺
          lead = mergeLead(extra, lead);
        }
        if (out.action === 'register') {
          const e = events.find((x) => x.slug === out.eventSlug && x.registrationOpen);
          if (e) actions.push(registerAction(e, !!contactId, out.lang));
        } else if (out.action === 'join') actions.push(joinAction(out.lang));
      }
      if (inLead && !leadSubmitted && hasContact(lead) && leadNextStep(lead) === 'ready' && !actions.some((a) => a.type === 'lead')) actions.push(leadAction(lead));
      answer = {
        reply: finalizeReply(reply, out?.lang ?? lang),
        tier: out ? tier : 0,
        route: out ? 'model' : 'fallback',
        model: r.model,
        usage: r.usage,
        costMicros: r.costMicros,
        intent: out?.intent ?? null,
        actions
      };
      if (cacheKey && out && !actions.length && !inLead) await cacheSet(cacheKey, lang, text, answer.reply, tier, r.model);
    }
  }

  // ── 6. 记录 ──
  const a = answer as Answer;
  const pendingNext = inLead && !leadSubmitted ? leadNextStep(lead) : null;
  const totalCost = (a.costMicros ?? 0) + summaryCost;
  await addMessage({
    conversationId: conv.id,
    role: 'assistant',
    content: a.reply,
    tier: a.tier,
    route: a.route,
    model: a.model ?? null,
    usage: a.cached ? null : a.usage ?? null,
    costMicros: a.cached ? 0 : totalCost,
    cached: !!a.cached,
    faqId: a.faqId ?? null,
    intent: a.intent ?? (inLead ? 'lead' : null),
    action: a.actions.length ? a.actions : null,
    flags
  });
  await updateConversation(conv.id, {
    contactId,
    audience,
    lang,
    turnsDelta: 1,
    isLead: inLead,
    leadInfo: { ...lead, _pending: pendingNext },
    costDelta: a.cached ? 0 : totalCost
  });
  const modelCall = a.route === 'model' || (a.route === 'fallback' && (a.costMicros ?? 0) > 0);
  await bumpDaily({
    calls: 1,
    tier0: !a.cached && a.tier === 0 ? 1 : 0,
    tier1: !a.cached && a.tier === 1 ? 1 : 0,
    tier2: !a.cached && a.tier === 2 ? 1 : 0,
    cache_hits: a.cached ? 1 : 0,
    model_calls: (modelCall ? 1 : 0) + summaryModelCalls,
    limited: overLimit ? 1 : 0,
    input_tokens: a.cached ? 0 : (a.usage?.input ?? 0) + (a.usage?.cacheRead ?? 0) + (a.usage?.cacheWrite ?? 0),
    output_tokens: a.cached ? 0 : a.usage?.output ?? 0,
    cost_micros: a.cached ? 0 : totalCost
  });

  return res(200, {
    ok: true,
    reply: a.reply,
    tier: a.cached ? 0 : a.tier,
    route: a.route,
    actions: a.actions.length ? a.actions : undefined,
    conversationId: conv.id
  });
}
