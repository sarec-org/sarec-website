/**
 * 海报文案：按活动主题给 5 组「片名（2–4 字）+ 宣传语（一句）」备选，东哥选或自己改；不填就用活动名。
 * 文字模型跟着画图服务的账号走（POSTER_TEXT_PROVIDER 可单独指定：cloudflare | gateway | gemini | none）。
 * 没有可用的文字模型时返回空列表 + 说明，不报错（后台照样能手填）。
 */
import { fetchJson } from './providers/types';

export type CopyIdea = { title: string; tagline: string };

const SYS =
  '你是电影海报文案。为一场商会活动写 5 组海报文案，每组：片名（2 到 4 个汉字，像电影片名，有力量感）+ 宣传语（一句，12 到 20 个字，像电影海报上的 tagline）。' +
  '不要出现任何品牌名、车型名、人名、价格、“免费”、报名人数；不要标点堆砌。只输出 JSON：{"ideas":[{"title":"","tagline":""}]}';

function pick(): string {
  const want = (process.env.POSTER_TEXT_PROVIDER || '').trim().toLowerCase();
  if (want) return want;
  const img = (process.env.POSTER_IMAGE_PROVIDER || '').trim().toLowerCase();
  if (img === 'cloudflare' && process.env.CLOUDFLARE_AI_TOKEN) return 'cloudflare';
  if (img === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';
  if (img === 'gateway') return 'gateway';
  return 'none';
}

export function parseIdeas(text: string): CopyIdea[] {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    const j = JSON.parse(m[0]) as { ideas?: { title?: unknown; tagline?: unknown }[] };
    return (j.ideas ?? [])
      .map((x) => ({ title: String(x.title ?? '').replace(/[《》「」"“”\s]/g, '').slice(0, 6), tagline: String(x.tagline ?? '').replace(/^["“]|["”]$/g, '').trim().slice(0, 30) }))
      .filter((x) => x.title.length >= 2 && x.tagline)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function suggestCopy(ev: { title: string; summary?: string | null }, typeLabel: string): Promise<{ ideas: CopyIdea[]; provider: string; model: string; note: string | null; prompt: string }> {
  const user = `活动类型：${typeLabel}\n活动名：${ev.title}\n简介：${(ev.summary ?? '').slice(0, 300)}`;
  const prompt = `${SYS}\n\n${user}`;
  const which = pick();
  try {
    if (which === 'cloudflare') {
      const model = process.env.POSTER_CF_TEXT_MODEL?.trim() || '@cf/qwen/qwen3-30b-a3b-fp8';
      const j = (await fetchJson(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_AI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }], max_tokens: 800 })
      }, 60_000)) as { result?: { response?: unknown; choices?: { message?: { content?: string } }[] } };
      const r = j.result;
      const text = typeof r?.response === 'string' ? r.response : r?.response ? JSON.stringify(r.response) : r?.choices?.[0]?.message?.content ?? '';
      return { ideas: parseIdeas(text), provider: 'cloudflare', model, note: null, prompt };
    }
    if (which === 'gateway') {
      const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
      if (!key) return { ideas: [], provider: 'none', model: '', note: '文字模型没配置，请手填片名和宣传语。', prompt };
      const model = process.env.POSTER_GATEWAY_TEXT_MODEL?.trim() || 'google/gemini-2.5-flash';
      const j = (await fetchJson('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }], response_format: { type: 'json_object' } })
      }, 60_000)) as { choices?: { message?: { content?: string } }[] };
      return { ideas: parseIdeas(j.choices?.[0]?.message?.content ?? ''), provider: 'gateway', model, note: null, prompt };
    }
    if (which === 'gemini' && process.env.GEMINI_API_KEY) {
      const model = process.env.POSTER_GEMINI_TEXT_MODEL?.trim() || 'gemini-2.5-flash';
      const j = (await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ parts: [{ text: user }] }], generationConfig: { responseMimeType: 'application/json' } })
      }, 60_000)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return { ideas: parseIdeas(j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''), provider: 'gemini', model, note: null, prompt };
    }
  } catch (e) {
    return { ideas: [], provider: which, model: '', note: `文案建议这会儿出不来（${e instanceof Error ? e.message.slice(0, 80) : '服务没响应'}），请手填。`, prompt };
  }
  return { ideas: [], provider: 'none', model: '', note: '还没接文字模型，请手填片名和宣传语（不填就用活动名）。', prompt };
}
