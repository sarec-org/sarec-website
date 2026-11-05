/**
 * AI 助手 —— 纯文本工具（无数据库、无网络；scripts/agent-tests.ts 直接测试）。
 * 注意：tsconfig target = es5，不用正则 u / s 标志，不直接遍历 Map / Set。
 */
import { createHash } from 'node:crypto';

export const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

const CJK = '\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';
const CJK_RE = new RegExp(`[${CJK}]`);
const CJK_RUN = new RegExp(`[${CJK}]+`, 'g');

export function hasCjk(s: string): boolean {
  return CJK_RE.test(s);
}

/** 访客语言：有中文就按中文；纯英文按英文。 */
export function detectLang(s: string): 'zh' | 'en' {
  if (hasCjk(s)) return 'zh';
  return /[a-zA-Z]{2,}/.test(s) ? 'en' : 'zh';
}

/** 规范化：全角转半角、去标点空白、小写。用于缓存键、重复判断、关键词匹配。 */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　]+/g, ' ')
    .replace(/[!-/:-@[-`{-~。，、；：？！…—·「」『』（）《》〈〉【】“”‘’]/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
}

export const normalizeTight = (s: string) => normalize(s).replace(/ /g, '');

export function clip(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

const STOP = new Set(
  'the a an and or of to in on for is are be with what how do does i you we my your me it this that can 的 了 吗 呢 吧 啊 是 在 和 与 我 你 您 们 有 么 什么 怎么 一下 请问 想 要 可以'.split(' ')
);

const FUNC_CHARS = /[的了吗呢吧啊呀嘛是在和与及或我你您他她它们有么什怎样这那哪个就都也还要会能可把被让给对从向于很太更吗请问想]/g;

/** BM25 用分词：英文 / 数字按词；中文连续串切成二字组（单字串保留单字）。 */
export function tokenize(s: string): string[] {
  const t = s.normalize('NFKC').toLowerCase();
  const out: string[] = [];
  const latin = t.replace(CJK_RUN, ' ').match(/[a-z0-9][a-z0-9+\-]*/g) ?? [];
  for (const w of latin) if (w.length > 1 && !STOP.has(w)) out.push(w);
  // 先在虚词处断开（“最近有什么活动” → 最近 / 活动），再切二字组，去掉“是什”“么样”这类噪声
  const runs = (t.match(CJK_RUN) ?? []).join(' ').replace(FUNC_CHARS, ' ').split(' ').filter(Boolean);
  for (const r of runs) {
    if (r.length === 1) {
      if (!STOP.has(r)) out.push(r);
      continue;
    }
    for (let i = 0; i < r.length - 1; i++) {
      const bg = r.slice(i, i + 2);
      if (!STOP.has(bg)) out.push(bg);
    }
  }
  return out;
}

/** 关键词匹配：'活动+时间' = 两者都出现；返回命中字符数（越具体分越高），0 = 不匹配。 */
export function keywordScore(text: string, keywords: string[]): number {
  const t = normalize(text);
  const tight = t.replace(/ /g, '');
  let best = 0;
  for (const k of keywords) {
    const parts = k
      .split('+')
      .map((p) => normalize(p))
      .filter(Boolean);
    if (!parts.length) continue;
    const all = parts.every((p) => (hasCjk(p) ? tight.includes(p.replace(/ /g, '')) : (' ' + t + ' ').includes(' ' + p + ' ') || (p.includes(' ') && t.includes(p))));
    if (all) best = Math.max(best, parts.reduce((n, p) => n + p.replace(/ /g, '').length, 0) + (parts.length - 1) * 2);
  }
  return best;
}

// ── 联系方式提取（规则，不依赖模型）──────────────────────────────────────

export function extractEmail(s: string): string | null {
  const m = s.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
  return m ? m[0] : null;
}

export function extractPhone(s: string): string | null {
  const cleaned = s.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, ' ');
  const m = cleaned.match(/(\+?\d[\d\s().\-]{8,18}\d)/);
  if (!m) return null;
  const digits = m[1].replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return m[1].trim().startsWith('+') ? `+${digits}` : digits;
}

export function extractWechat(s: string): string | null {
  const m = s.match(/(?:微信|wechat|weixin|vx|wx)\s*(?:号|id)?\s*[:：是为]?\s*([A-Za-z][A-Za-z0-9_\-]{5,19})/i);
  return m ? m[1] : null;
}

export function extractName(s: string): string | null {
  const m = s.match(/(?:我叫|我是|我姓|称呼我|叫我|my name is|i am|i'm)\s*([一-龥]{1,4}|[A-Za-z][A-Za-z .'\-]{1,30})/i);
  if (!m) return null;
  const n = m[1].trim().replace(/[，,。.\s]+$/, '');
  if (/^(做|想|在|一个|开发|投资|项目|来)/.test(n)) return null;
  return n || null;
}

// ── 可疑内容判断（纯函数）────────────────────────────────────────────────

/** 无意义内容：没有字母汉字、同一字符大量重复、键盘乱敲。 */
export function looksMeaningless(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  const letters = (t.match(new RegExp(`[a-zA-Z${CJK}]`, 'g')) ?? []).length;
  if (letters === 0 && t.length > 3) return true;
  if (/(.)\1{9,}/.test(t)) return true;
  if (/^[a-z]{10,}$/i.test(t) && !/[aeiouy]/i.test(t)) return true;
  if (/(asdf|qwer|zxcv|jkl;|hjkl){2,}/i.test(t)) return true;
  // 少量字符反复：去重后不到 3 个字符但长度很长
  const uniq: Record<string, true> = {};
  for (let i = 0; i < t.length; i++) uniq[t[i]] = true;
  if (t.length >= 12 && Object.keys(uniq).length <= 3) return true;
  return false;
}

export const BOT_UA =
  /bot\b|bot\/|crawler|spider|crawl|slurp|curl\/|wget|python-requests|python-urllib|aiohttp|httpx|go-http-client|java\/|okhttp|libwww|scrapy|headlesschrome|phantomjs|selenium|puppeteer|playwright|node-fetch|axios\/|postmanruntime|insomnia/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim().length < 10) return true;
  return BOT_UA.test(ua);
}

// ── 日期（洛杉矶）────────────────────────────────────────────────────────

export const TZ = 'America/Los_Angeles';

/** 洛杉矶当天 YYYY-MM-DD */
export function laDay(d: Date = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function fmtLaTime(iso: string | Date, lang: 'zh' | 'en' = 'zh', tz = TZ): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    timeZone: tz,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang === 'en'
  }).format(d);
}
