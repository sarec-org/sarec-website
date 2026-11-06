/**
 * AI 助手 —— 模型调用（plain fetch，不引新 SDK）。
 * ------------------------------------------------------------------
 * 第 1 级：Gemini Flash（REST generateContent，GEMINI_API_KEY）。
 * 第 2 级：Claude Sonnet（Messages API，ANTHROPIC_API_KEY；系统提示词带 cache_control 提示缓存）。
 * 模拟：AGENT_MOCK=1 或非正式站没配 key —— 规则生成、确定性输出，只记“模拟花费”，不发任何外部请求。
 * 只在处理访客消息时被调用；任何定时任务都不会走到这里。
 */
import { MAX_OUTPUT_TOKENS, claudeModel, costMicros, geminiModel, hasAnthropicKey, hasGeminiKey, isMockMode, type Usage } from './config';
import { OUTPUT_SCHEMA, geminiSchema } from './prompt';

export type Turn = { role: 'user' | 'assistant'; text: string };

export type ModelResult = {
  ok: boolean;
  text: string;
  model: string;
  usage: Usage;
  costMicros: number;
  error?: string;
};

export type CallInput = {
  tier: 1 | 2;
  system: string;
  history: Turn[];
  user: string;
  maxTokens: number;
  json: boolean;
  /** 模拟模式：直接给出要返回的文本（由调用方按规则生成） */
  mockText?: string;
};

const ZERO: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
const TIMEOUT_MS = 25_000;

export function providerAvailable(tier: 1 | 2): boolean {
  if (isMockMode()) return true;
  return tier === 1 ? hasGeminiKey() : hasAnthropicKey();
}

export async function callModel(input: CallInput): Promise<ModelResult> {
  if (isMockMode()) return mockCall(input);
  return input.tier === 2 ? callClaude(input) : callGemini(input);
}

async function fetchJson(url: string, init: RequestInit): Promise<{ status: number; json: unknown }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal, cache: 'no-store' });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

// ── Gemini ───────────────────────────────────────────────────────────

type GeminiResp = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number; thoughtsTokenCount?: number };
  error?: { message?: string };
};

async function callGemini(input: CallInput): Promise<ModelResult> {
  const model = geminiModel();
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, text: '', model, usage: ZERO, costMicros: 0, error: 'no_key' };
  const contents = [...input.history, { role: 'user' as const, text: input.user }].map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: t.text }]
  }));
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: input.maxTokens,
    temperature: 0.3,
    // 关掉 / 压低思考：省 token、降延迟
    thinkingConfig: /^gemini-2\.5/.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: 'low' }
  };
  if (input.json) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = geminiSchema();
  }
  try {
    const { status, json } = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: input.system }] }, contents, generationConfig })
    });
    const r = (json ?? {}) as GeminiResp;
    const um = r.usageMetadata ?? {};
    const cached = um.cachedContentTokenCount ?? 0;
    const usage: Usage = {
      input: Math.max(0, (um.promptTokenCount ?? 0) - cached),
      output: (um.candidatesTokenCount ?? 0) + (um.thoughtsTokenCount ?? 0),
      cacheRead: cached,
      cacheWrite: 0
    };
    const cost = costMicros(model, usage);
    if (status >= 400) return { ok: false, text: '', model, usage, costMicros: cost, error: `gemini_${status}` };
    const text = (r.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    return { ok: !!text, text, model, usage, costMicros: cost, error: text ? undefined : `gemini_empty_${r.candidates?.[0]?.finishReason ?? ''}` };
  } catch (e) {
    return { ok: false, text: '', model, usage: ZERO, costMicros: 0, error: e instanceof Error && e.name === 'AbortError' ? 'gemini_timeout' : 'gemini_network' };
  }
}

// ── Claude ───────────────────────────────────────────────────────────

type ClaudeResp = {
  model?: string;
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  error?: { type?: string; message?: string };
};

async function callClaude(input: CallInput): Promise<ModelResult> {
  const model = claudeModel();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, text: '', model, usage: ZERO, costMicros: 0, error: 'no_key' };
  const messages = [...input.history, { role: 'user' as const, text: input.user }].map((t) => ({ role: t.role, content: t.text }));
  const base: Record<string, unknown> = {
    model,
    max_tokens: input.maxTokens,
    // 系统提示词固定不变 → 提示缓存（5 分钟）；检索内容和问题都在后面，不影响缓存命中
    system: [{ type: 'text', text: input.system, cache_control: { type: 'ephemeral' } }],
    messages
  };
  // 依次尝试：完整请求（低思考档 + JSON 格式 + 拒答自动换模型）→ 去掉 fallbacks → 再去掉 JSON 格式。只有 400 才降级重试。
  const attempts: { body: Record<string, unknown>; beta?: string }[] = [];
  const outputConfig = input.json ? { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } } : { effort: 'low' };
  attempts.push({ body: { ...base, output_config: outputConfig, fallbacks: 'default' }, beta: 'server-side-fallback-2026-07-01' });
  attempts.push({ body: { ...base, output_config: outputConfig } });
  if (input.json) attempts.push({ body: { ...base, output_config: { effort: 'low' } } });
  let last: ModelResult = { ok: false, text: '', model, usage: ZERO, costMicros: 0, error: 'claude_unknown' };
  for (const a of attempts) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
      if (a.beta) headers['anthropic-beta'] = a.beta;
      const { status, json } = await fetchJson('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(a.body) });
      const r = (json ?? {}) as ClaudeResp;
      const servedBy = r.model || model;
      const u = r.usage ?? {};
      const usage: Usage = { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 };
      const cost = costMicros(servedBy, usage);
      if (status === 400) {
        last = { ok: false, text: '', model: servedBy, usage, costMicros: cost, error: 'claude_400' };
        continue;
      }
      if (status >= 400) return { ok: false, text: '', model: servedBy, usage, costMicros: cost, error: `claude_${status}` };
      if (r.stop_reason === 'refusal') return { ok: false, text: '', model: servedBy, usage, costMicros: cost, error: 'claude_refusal' };
      const text = (r.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('')
        .trim();
      return { ok: !!text, text, model: servedBy, usage, costMicros: cost, error: text ? undefined : 'claude_empty' };
    } catch (e) {
      return { ok: false, text: '', model, usage: ZERO, costMicros: 0, error: e instanceof Error && e.name === 'AbortError' ? 'claude_timeout' : 'claude_network' };
    }
  }
  return last;
}

// ── 模拟 ─────────────────────────────────────────────────────────────

const estTokens = (s: string) => Math.ceil(s.length / 1.6);

function mockCall(input: CallInput): ModelResult {
  const model = `mock:${input.tier === 2 ? claudeModel() : geminiModel()}`;
  const text = input.mockText ?? '（模拟回答）';
  const inTok = estTokens(input.system) + input.history.reduce((n, t) => n + estTokens(t.text), 0) + estTokens(input.user);
  // 模拟提示缓存：第 2 级系统提示词按缓存读取计
  const sys = input.tier === 2 ? estTokens(input.system) : 0;
  const usage: Usage = { input: inTok - sys, output: Math.min(input.maxTokens, estTokens(text)), cacheRead: sys, cacheWrite: 0 };
  return { ok: true, text, model, usage, costMicros: costMicros(model, usage) };
}

export const MAX_TOKENS = MAX_OUTPUT_TOKENS;
