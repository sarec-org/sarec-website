/**
 * AI 助手 —— 配置与价格表（密钥只从 env 读，绝不写进代码或日志）。
 */

export const LIMITS = {
  /** 普通访客每天条数（cookie 与 IP 哈希分别计数，取较大者） */
  visitorDaily: 30,
  /** 同一 IP 每天总条数（活动现场 WiFi、公司网络多人共用一个 IP，单独放宽） */
  ipDaily: 200,
  /** 降速惩罚：安静这么多分钟后清零；正常发一条减一次 */
  strikeDecayMinutes: 10,
  /** 单条消息最长字符；超过 longPaste 视为可疑，超过 hardMax 直接拒收 */
  longPaste: 1500,
  hardMax: 4000,
  /** 回答长度上限（中文字符；英文按约 2.5 倍字符） */
  replyZhChars: 400,
  /** 每次最多发给模型几段检索内容 */
  chunks: 4,
  /** 超过多少轮（访客提问）开始压缩成摘要；保留最近几轮原文 */
  summarizeAfterTurns: 6,
  keepRecentTurns: 3,
  /** 答案缓存时长 */
  cacheHours: 24,
  /** 连发：多少秒内超过几条算可疑 */
  burstWindowSec: 10,
  burstMax: 4,
  minIntervalMs: 1500,
  /** 人机验证通过后免检分钟数；验证失败几次算机器人 */
  verifiedMinutes: 30,
  turnstileFailsToBlock: 3
};

export const MAX_OUTPUT_TOKENS = { tier1: 700, tier2: 1200, summary: 300 };

export function geminiModel(): string {
  return (process.env.AGENT_GEMINI_MODEL || 'gemini-2.5-flash').trim();
}
export function claudeModel(): string {
  return (process.env.AGENT_CLAUDE_MODEL || 'claude-sonnet-5-5').trim();
}

export const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY);
export const hasAnthropicKey = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const isProductionEnv = () => process.env.VERCEL_ENV === 'production';

/**
 * 模拟模式：AGENT_MOCK=1，或（非正式站且两个 key 都没配）。不花钱，行为确定，便于测试路由、预算、线索。
 * 正式站缺 key：不模拟，只走常见问题库 + “留下联系方式”。
 */
export function isMockMode(): boolean {
  if (process.env.AGENT_MOCK === '1' || process.env.AGENT_MOCK === 'true') return true;
  if (process.env.AGENT_MOCK === '0') return false;
  return !isProductionEnv() && !hasGeminiKey() && !hasAnthropicKey();
}

export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export function ipSalt(): string {
  return process.env.AGENT_IP_SALT || 'sarec-agent-ip-v1';
}

export function alertEmail(): string | null {
  return (process.env.AGENT_ALERT_EMAIL || process.env.SAREC_ALERT_EMAIL || process.env.SAREC_ADMIN_EMAIL || '').trim() || null;
}
export function digestEmail(): string | null {
  return (process.env.AGENT_DIGEST_EMAIL || process.env.SAREC_ALERT_EMAIL || process.env.SAREC_ADMIN_EMAIL || '').trim() || null;
}

// ── 价格表（美元 / 百万 token；2026-11 官方标价）──────────────────────────────
// 新模型不在表里时按“偏贵”的兜底价估算，宁可多算，不让预算漏算。
export type Price = { input: number; output: number; cacheRead: number; cacheWrite: number };

export const PRICES: Record<string, Price> = {
  // Anthropic：缓存写入 = 1.25 × 输入（5 分钟），缓存读取见各模型
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  // Google Gemini（≤200K 提示；隐式缓存读取约 0.1–0.25 × 输入）
  'gemini-2.5-flash': { input: 0.3, output: 2.5, cacheRead: 0.03, cacheWrite: 0.3 },
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4, cacheRead: 0.01, cacheWrite: 0.1 },
  'gemini-3-flash': { input: 0.5, output: 3, cacheRead: 0.05, cacheWrite: 0.5 },
  'gemini-3-flash-preview': { input: 0.5, output: 3, cacheRead: 0.05, cacheWrite: 0.5 }
};
const FALLBACK_PRICE: Price = { input: 4, output: 20, cacheRead: 0.4, cacheWrite: 5 };

export function priceFor(model: string): Price {
  const m = model.replace(/^mock:/, '').replace(/^models\//, '');
  if (PRICES[m]) return PRICES[m];
  const key = Object.keys(PRICES)
    .filter((k) => m.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key] : FALLBACK_PRICE;
}

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** 花费（micro-USD，整数）。input = 未命中缓存的输入 token。 */
export function costMicros(model: string, u: Usage): number {
  const p = priceFor(model);
  // 价格是 $/1M token；micro-USD = $ × 1e6 → 正好等于 token × 单价
  return Math.round(u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite);
}

export const usd = (micros: number) => micros / 1_000_000;
export const fmtUsd = (micros: number) => `$${usd(micros).toFixed(micros < 10_000 ? 4 : 2)}`;
