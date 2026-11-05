/**
 * AI 助手 —— 意图与边界（纯规则，不调模型；scripts/agent-tests.ts 直接测试）。
 * 线索判断、投资回报 / 法律税务 / 代发邮件边界、报名 / 入会意图、线索信息收集顺序。
 */
import { extractEmail, extractName, extractPhone, extractWechat, normalize } from './text';

export type Lang = 'zh' | 'en';

export type LeadInfo = {
  need?: string | null;
  region?: string | null;
  timeline?: string | null;
  wantsCall?: boolean | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
};

export type LeadStep = 'need' | 'region' | 'timeline' | 'call' | 'contact' | 'ready';

const LEAD_RE =
  /项目|开发|资金|融资|找钱|募资|合作|投资人|投资方|出资|拿地|土地|地块|盖房|建房|加建|adu|ed1|公寓|酒店|商业地产|收购|买楼|开发商|尽调|结构设计|lp|gp|合伙|基金|贷款|建设|施工|entitlement|joint venture|\bjv\b|partnership|partner|develop|financ|capital|funding|\bfund|land|\bdeal|project|invest/i;

/** 高价值线索：聊到项目、开发、资金、合作。 */
export function isLeadIntent(text: string): boolean {
  const t = normalize(text);
  if (!LEAD_RE.test(t)) return false;
  // 只是问文章 / 名词解释，不算线索
  if (/^(什么是|.{0,8}是什么(意思)?$)|what is|what does .* mean/i.test(t) && t.length < 30) return false;
  // 需要“自己有事要办”的信号：我 / 我们 / 手上 / 想 / 计划 / 找 ……
  return /我|我们|手上|手里|有个|有一个|有块|想|计划|打算|准备|需要|寻找|找|希望|能不能帮|可以帮|合作|\bi\b|\bi'm|\bwe\b|\bour\b|\bmy\b|looking for|plan|want|need|seeking/i.test(t);
}

const RETURN_WORD = /回报|收益|年化|利息|分红|估值|赚多少|能赚|翻倍|保本|irr|roi|yield|valuation|returns?\b|profit/i;
const RETURN_ASK = /多少|几个点|几成|保证|保本|承诺|能不能|高不高|怎么样|如何|预期|大概|稳不稳|靠谱|how much|guarantee|expect|typical|can i (get|make|earn)|what.{0,10}(is|are)|good/i;

/** 问投资回报 / 收益 / 估值（不谈，礼貌拒绝 + 约电话）。名词解释（“IRR 是什么”）不算。 */
export function asksInvestmentReturn(text: string): boolean {
  const t = normalize(text);
  if (/保本|保证收益|保底|稳赚|guaranteed return/i.test(t)) return true;
  if (!RETURN_WORD.test(t)) return false;
  if (/是什么|什么意思|怎么算|如何计算|区别|定义|what is (an? )?(irr|roi|cap rate)|how to calculate|difference/i.test(t)) return false;
  return RETURN_ASK.test(t);
}

/** 法律 / 税务意见。 */
export function asksLegalTax(text: string): boolean {
  const t = normalize(text);
  return /法律意见|律师意见|合法吗|是否合法|违法|犯法|避税|逃税|报税|怎么交税|交多少税|税率|税务(怎么|如何|规划|筹划|问题)|税怎么|合同怎么写|起诉|打官司|诉讼|移民(怎么|能不能)办|legal advice|tax advice|is (it|this) legal|lawsuit|sue\b|avoid tax|how much tax|tax rate|file (my )?tax/i.test(t);
}

/** 要求代发邮件 / 代为联系某人。 */
export function asksSendOnBehalf(text: string): boolean {
  const t = normalize(text);
  return /(帮|替|代)我?(发|写)?.{0,4}(邮件|email|短信|消息)|(帮|替|代)我.{0,6}(联系|通知|转告|约)(他|她|某|一下|.{0,6}(先生|女士|总|老师))|转告|send (an )?email|email (him|her|them)|contact (him|her|them) for me|message (him|her) for me/i.test(t);
}

export function wantsRegister(text: string): boolean {
  const t = normalize(text);
  return /帮我报名|我要报名|我想报名|想报名|报名这|给我报名|替我报名|我要参加|我想参加|想参加这|报个名|register me|sign me up|i want to (register|join the event|attend)|i'd like to (register|attend)/i.test(t);
}

export function wantsJoin(text: string): boolean {
  const t = normalize(text);
  return /我要入会|我想入会|想入会|申请入会|我要加入商会|想加入商会|成为会员|怎么入会|如何入会|i want to join|become a member|apply for membership/i.test(t);
}

/** 线索信息收集顺序：需求 → 地区 → 时间安排 → 要不要约创始人电话 → 联系方式 → 确认卡片。 */
export function leadNextStep(info: LeadInfo): LeadStep {
  if (!info.need) return 'need';
  if (!info.region) return 'region';
  if (!info.timeline) return 'timeline';
  if (info.wantsCall === undefined || info.wantsCall === null) return 'call';
  if (!info.phone && !info.email && !info.wechat) return 'contact';
  return 'ready';
}

export function hasContact(info: LeadInfo): boolean {
  return !!(info.phone || info.email || info.wechat);
}

const REGION_RE =
  /(洛杉矶|大洛杉矶|橙县|尔湾|圣盖博|圣地亚哥|旧金山|湾区|硅谷|加州|南加|北加|纽约|新泽西|德州|休斯顿|达拉斯|奥斯汀|佛州|迈阿密|西雅图|拉斯维加斯|亚利桑那|凤凰城|夏威夷|芝加哥|波士顿|美国|国内|中国|上海|北京|深圳|广州|香港|台湾|los angeles|\bla\b|orange county|irvine|san gabriel|san diego|san francisco|bay area|california|\bca\b|new york|\bny\b|texas|houston|dallas|austin|florida|miami|seattle|las vegas|arizona|phoenix|hawaii|chicago|boston)/i;
const TIME_RE =
  /(\d{1,2}\s*月|\d{4}\s*年|今年|明年|后年|年底|年初|年中|上半年|下半年|季度|q[1-4]|\d+\s*(个)?(月|周|星期|天|年)内?|马上|尽快|立即|最近|近期|下个月|这个月|半年|一年|两年|不急|还没定|待定|asap|soon|next (month|year|quarter)|this (month|year|quarter)|within|\d+\s*(months?|weeks?|years?))/i;
const YES_RE = /^(好|好的|可以|行|要|没问题|当然|愿意|方便|ok|okay|yes|sure|yep|please|好啊|可以的|约吧|约一下|想约)|好的|可以约|约电话|想约|愿意聊|方便聊/i;
const NO_RE = /^(不用|不要|暂时不|先不|不必|不需要|算了|no\b|not now|no thanks)|先不约|不用约|不想约/i;

/**
 * 规则版信息提取：从访客这句话里补上线索信息（模型不可用、模拟模式、或作为模型结果的补充）。
 * pending = 上一轮助手在问的那一项。
 */
export function extractLeadSlots(text: string, pending: LeadStep | null, current: LeadInfo): LeadInfo {
  const out: LeadInfo = {};
  const t = text.trim();
  const email = extractEmail(t);
  const phone = extractPhone(t);
  const wechat = extractWechat(t);
  const name = extractName(t);
  if (email) out.email = email;
  if (phone) out.phone = phone;
  if (wechat) out.wechat = wechat;
  if (name) out.name = name;
  const region = t.match(REGION_RE)?.[1];
  if (region && !current.region) out.region = region;
  const time = t.match(TIME_RE)?.[1];
  if (time && !current.timeline) out.timeline = time;
  if (!current.need && isLeadIntent(t)) out.need = t.slice(0, 300);
  if (pending === 'need' && !current.need && !out.need && t.length >= 4) out.need = t.slice(0, 300);
  // 正在问这一项、回答又很短：整句就是答案（“明年上半年”比只取“明年”更完整）
  const shortAnswer = t.length <= 30 && !email && !phone && !wechat;
  if (pending === 'region' && !current.region && shortAnswer) out.region = t.slice(0, 60);
  if (pending === 'timeline' && !current.timeline && shortAnswer) out.timeline = t.slice(0, 60);
  if (pending === 'call' || (current.wantsCall == null && /电话|call/i.test(t))) {
    if (NO_RE.test(t)) out.wantsCall = false;
    else if (YES_RE.test(t) || email || phone || wechat) out.wantsCall = true;
  }
  if ((email || phone || wechat) && current.wantsCall == null && out.wantsCall == null) out.wantsCall = true;
  return out;
}

export function mergeLead(a: LeadInfo, b: LeadInfo): LeadInfo {
  const out: LeadInfo = { ...a };
  (Object.keys(b) as (keyof LeadInfo)[]).forEach((k) => {
    const v = b[k];
    if (v === undefined || v === null || v === '') return;
    (out as Record<string, unknown>)[k] = typeof v === 'string' ? v.trim().slice(0, 300) : v;
  });
  return out;
}

/** 线索下一步该问什么（固定话术：模型不可用时用；模型可用时作为提示）。 */
export function leadQuestion(step: LeadStep, lang: Lang): string {
  const zh: Record<LeadStep, string> = {
    need: '方便具体说说吗？比如是什么类型的项目、现在走到哪一步、希望商会在哪方面帮忙。',
    region: '项目（或您关注的资产）在哪个地区？',
    timeline: '时间上大概怎么安排？比如希望什么时候启动或做决定。',
    call: '了解了。要不要约创始人 15 分钟电话，直接聊聊您的情况？',
    contact: '好的。方便留个称呼和联系方式吗（手机、邮箱或微信任选其一）？我整理好后转给同事，尽快和您联系。',
    ready: '我把您的信息整理成了下面这张卡片，请确认无误后点击“确认提交”，同事会尽快联系您。'
  };
  const en: Record<LeadStep, string> = {
    need: 'Could you tell me a bit more — what kind of project it is, where it stands now, and where you would like the chamber to help?',
    region: 'Which area is the project (or the asset you are looking at) in?',
    timeline: 'What timeline are you working with — when would you like to start or decide?',
    call: 'Got it. Would a 15-minute call with our founder be helpful?',
    contact: 'Great. Could you leave your name and one way to reach you (phone, email or WeChat)? I will pass it to a colleague who will follow up shortly.',
    ready: 'I have summarised your details in the card below. Please check them and tap “Confirm” — a colleague will be in touch soon.'
  };
  return (lang === 'en' ? en : zh)[step];
}

/** 边界固定回复（不调模型）。 */
export function boundaryReply(kind: 'returns' | 'legal_tax' | 'on_behalf', lang: Lang): string {
  if (lang === 'en') {
    if (kind === 'returns')
      return 'I am not able to discuss investment returns, yields or valuations here — those depend on the specific project and need a proper conversation. If useful, I can arrange a short call with our founder to talk through your situation.';
    if (kind === 'legal_tax')
      return 'I cannot give legal or tax advice — for that, please consult a licensed attorney or CPA. If helpful, the chamber can introduce member firms in those fields.';
    return 'I cannot send emails or contact anyone on your behalf. If you leave your own contact details here, a colleague from the chamber will follow up with you directly.';
  }
  if (kind === 'returns')
    return '投资回报、收益率、估值这类问题，我这里不谈——要看具体项目，也需要当面把情况聊清楚。如果方便，我可以帮您约创始人 15 分钟电话，直接聊。';
  if (kind === 'legal_tax')
    return '法律和税务问题我不能给意见，建议咨询持牌律师或会计师。需要的话，商会可以介绍相关领域的会员机构给您。';
  return '我不能替您发邮件或联系任何人。您可以在这里留下自己的联系方式，商会同事会直接和您联系。';
}
