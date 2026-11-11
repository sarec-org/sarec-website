/**
 * 画图服务（可切换）：后台 AI 海报面板里选（存在配置项 poster_image_provider，立即生效、不用重新部署）；
 * 后台没选时用环境变量 POSTER_IMAGE_PROVIDER = cloudflare | gateway | gemini | pollinations | placeholder
 * 没配或密钥没到位 → 用占位图（placeholder，纯色渐变、无文字），整个流程照样能跑通。
 * 环境变量（只放 Vercel，不写进代码）：
 *   cloudflare   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN（Workers AI；每天 1 万 Neurons 免费），可选 POSTER_CF_MODEL
 *   gateway      Vercel AI Gateway：AI_GATEWAY_API_KEY（AI Gateway → API Keys 里建，可设预算；没填时用部署自带的 OIDC 令牌；团队要先绑卡）；可选 POSTER_GATEWAY_MODEL
 *   gemini       GEMINI_API_KEY（Google AI Studio），可选 POSTER_GEMINI_MODEL
 *   pollinations 可选 POLLINATIONS_TOKEN（不填是匿名：有水印、限速、分辨率低，只适合看效果）
 */
import sharp from 'sharp';
import { fetchJson, redactSecrets, type GenImage, type ImageProvider } from './types';
export { redactSecrets };

const W = 1024;
const H = 1536;

// ── 占位图：深色渐变 + 一圈光，模拟“上部主体 + 下部暗区”，不调任何外部服务 ──────────
const PALETTES = [
  ['#04121C', '#0E4A5C', '#FF8A3D'],
  ['#030617', '#0B1640', '#35E0FF'],
  ['#120A1E', '#3A1450', '#FF4FD8'],
  ['#0B0B0B', '#2B2D33', '#E3C57A'],
  ['#061A12', '#12523F', '#39FF88'],
  ['#160606', '#5C1010', '#FFB347']
];
export const placeholder: ImageProvider = {
  key: 'placeholder',
  label: '占位图（未接画图服务）',
  model: 'placeholder',
  costPerImage: 0,
  configured: () => true,
  async generate(_prompt, seed) {
    const [a, b, c] = PALETTES[Math.abs(seed) % PALETTES.length];
    const cx = 30 + (Math.abs(seed * 7) % 40);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.45" stop-color="${b}"/><stop offset="0.62" stop-color="${a}"/><stop offset="1" stop-color="#000"/></linearGradient>
      <radialGradient id="r" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${c}" stop-opacity="0.85"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/><circle cx="${(cx / 100) * W}" cy="${H * 0.42}" r="${W * 0.5}" fill="url(#r)"/>
      <path d="M${W / 2} ${H * 0.58} L${-W * 0.3} ${H} H${W * 1.3} Z" fill="#000" opacity="0.35"/></svg>`;
    return { data: await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer(), contentType: 'image/jpeg' };
  }
};

// ── Cloudflare Workers AI ────────────────────────────────────────────────
const CF_NEURON_USD = 0.011 / 1000;
const cfModel = () => process.env.POSTER_CF_MODEL?.trim() || '@cf/black-forest-labs/flux-2-klein-4b';
const cfAccount = () => process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
const cfToken = () => process.env.CLOUDFLARE_AI_TOKEN?.trim() || '';
/** 常见填错：把 Cloudflare 页面上整条 curl 测试命令（或带 “Bearer ”）一起粘贴进去 */
function cfProblem(): string | null {
  const a = cfAccount();
  const t = cfToken();
  if (!a || !t) return null;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(t)) return 'Cloudflare 的 CLOUDFLARE_AI_TOKEN 格式不对：只粘贴令牌本身（一整串字母数字），不要带 curl 命令、“Bearer”、引号或空格。';
  if (!/^[0-9a-f]{32}$/i.test(a)) return 'Cloudflare 的 CLOUDFLARE_ACCOUNT_ID 格式不对：应是 32 位字母数字（Workers AI 页面 “Account ID” 那一串）。';
  return null;
}
/** 按 Cloudflare 公布的 Neurons 价估算（832×1248 ≈ 6 个 512 小块）；免费额度内实际 0 元 */
function cfNeurons(model: string): number {
  if (model.includes('lucid-origin')) return 6 * 636 + 30 * 12;
  if (model.includes('phoenix')) return 6 * 530 + 25 * 10;
  if (model.includes('flux-1-schnell')) return 4 * 4.8 + 4 * 9.6;
  if (model.includes('flux-2-klein-9b')) return 1364 + 182 * 0.04;
  if (model.includes('flux-2-klein-4b')) return 6 * 26.05 * 4;
  if (model.includes('flux-2-dev')) return 6 * 37.5 * 25;
  return 2000;
}
export const cloudflare: ImageProvider = {
  key: 'cloudflare',
  label: 'Cloudflare Workers AI',
  get model() { return cfModel(); },
  get costPerImage() { return Math.round(cfNeurons(cfModel()) * CF_NEURON_USD * 10000) / 10000; },
  configured: () => !!(cfAccount() && cfToken()) && !cfProblem(),
  problem: cfProblem,
  async generate(prompt, seed) {
    const model = cfModel();
    const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccount()}/ai/run/${model}`;
    const auth = { Authorization: `Bearer ${cfToken()}` };
    let res: Response;
    if (model.includes('flux-2')) {
      // FLUX.2 系列要 multipart
      const fd = new FormData();
      fd.append('prompt', prompt);
      // FLUX.2 dev 按 512 小块 × 步数计价：1024×1536 与 832×1248 同为 6 块，取大的；步数固定 25（不随默认值变动，成本可控）
      const dev = model.includes('flux-2-dev');
      fd.append('width', dev ? '1024' : '832');
      fd.append('height', dev ? '1536' : '1248');
      if (dev) fd.append('steps', '25');
      fd.append('seed', String(seed));
      res = await fetch(url, { method: 'POST', headers: auth, body: fd });
    } else {
      const body: Record<string, unknown> = { prompt, seed };
      if (model.includes('flux-1-schnell')) body.steps = 8; // schnell 只出方图，后面裁成 2:3
      else Object.assign(body, { width: 832, height: 1248 });
      res = await fetch(url, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) throw new Error(`Cloudflare 画图失败（${res.status}）：${(await res.text()).slice(0, 200)}`);
    if (ct.startsWith('image/')) return { data: Buffer.from(await res.arrayBuffer()), contentType: ct };
    const j = (await res.json()) as { result?: { image?: string } };
    if (!j.result?.image) throw new Error('Cloudflare 没有返回图片');
    return { data: Buffer.from(j.result.image, 'base64'), contentType: 'image/jpeg' };
  }
};

// ── Vercel AI Gateway（OpenAI 兼容 /v1/images/generations）──────────────────
const GW_PRICES: Record<string, number> = { 'bfl/flux-pro-1.1': 0.04, 'bfl/flux-pro-1.1-ultra': 0.06, 'bytedance/seedream-4.0': 0.03, 'bytedance/seedream-4.5': 0.04, 'bfl/flux-3-image': 0.048, 'bfl/flux-3-image-klein': 0.009, 'meta/muse-image-1.0': 0.01, 'spacexai/grok-imagine-image': 0.02, 'recraft/recraft-v4.1-flash': 0.007 };
const gwModel = () => process.env.POSTER_GATEWAY_MODEL?.trim() || 'bytedance/seedream-4.0';
// 优先用 AI Gateway 的 API Key（可设预算上限）；没填时用 Vercel 部署自带的 OIDC 令牌
const gwKey = () => process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';
export const gateway: ImageProvider = {
  key: 'gateway',
  label: 'Vercel AI Gateway',
  get model() { return gwModel(); },
  get costPerImage() { return GW_PRICES[gwModel()] ?? 0.04; },
  configured: () => !!gwKey(),
  async generate(prompt, seed) {
    const j = (await fetchJson('https://ai-gateway.vercel.sh/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${gwKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: gwModel(), prompt, n: 1, size: '1024x1536', seed, response_format: 'b64_json', providerOptions: { blackForestLabs: { aspectRatio: '2:3', outputFormat: 'jpeg' } } })
    })) as { data?: { b64_json?: string }[] };
    const b = j.data?.[0]?.b64_json;
    if (!b) throw new Error('AI Gateway 没有返回图片');
    return { data: Buffer.from(b, 'base64'), contentType: 'image/png' };
  }
};

// ── Google Gemini（AI Studio 密钥）─────────────────────────────────────────
const gmModel = () => process.env.POSTER_GEMINI_MODEL?.trim() || 'gemini-2.5-flash-image';
export const gemini: ImageProvider = {
  key: 'gemini',
  label: 'Google Gemini',
  get model() { return gmModel(); },
  costPerImage: 0.039,
  configured: () => !!process.env.GEMINI_API_KEY,
  async generate(prompt) {
    const j = (await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${gmModel()}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '2:3' } } })
    })) as { candidates?: { content?: { parts?: { inlineData?: { data: string; mimeType: string } }[] } }[] };
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData) throw new Error('Gemini 没有返回图片（可能被安全策略拦下，换个风格再试）');
    return { data: Buffer.from(part.inlineData.data, 'base64'), contentType: part.inlineData.mimeType || 'image/png' };
  }
};

// ── Pollinations（免费；不带 token 是匿名：有水印、限速）────────────────────────
export const pollinations: ImageProvider = {
  key: 'pollinations',
  label: 'Pollinations（免费）',
  model: 'flux',
  costPerImage: 0,
  configured: () => true,
  async generate(prompt, seed) {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${W}&height=${H}&model=flux&nologo=true&private=true&seed=${seed}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 150_000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: process.env.POLLINATIONS_TOKEN ? { Authorization: `Bearer ${process.env.POLLINATIONS_TOKEN}` } : {} });
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.startsWith('image/')) throw new Error(`Pollinations 画图失败（${r.status}）`);
      return { data: Buffer.from(await r.arrayBuffer()), contentType: ct };
    } finally {
      clearTimeout(t);
    }
  }
};

const ALL: Record<string, ImageProvider> = { placeholder, cloudflare, gateway, gemini, pollinations };

/** 后台可选的画图服务（只列两家正式服务 + 占位图），带“密钥填好没有” */
export const SWITCHABLE = ['cloudflare', 'gateway', 'placeholder'] as const;
export function providerChoices() {
  return SWITCHABLE.map((k) => ({ key: k, label: ALL[k].label, model: ALL[k].model, costPerImage: ALL[k].costPerImage, configured: ALL[k].configured(), problem: ALL[k].problem?.() ?? null }));
}

/** 当前用哪个：后台选的（choice）> 环境变量；选的服务密钥没填齐 → 占位图（并告诉后台为什么） */
export function imageProvider(choice?: string | null): { p: ImageProvider; note: string | null } {
  const want = (choice || process.env.POSTER_IMAGE_PROVIDER || '').trim().toLowerCase();
  if (!want) return { p: placeholder, note: '还没接画图服务，现在出的是占位图（流程可以先试）。' };
  const p = ALL[want];
  if (!p) return { p: placeholder, note: `画图服务“${want}”不认识，暂用占位图。` };
  const bad = p.problem?.();
  if (bad) return { p: placeholder, note: `${bad}改好后在 Vercel 重新部署一次。暂用占位图。` };
  if (!p.configured()) return { p: placeholder, note: `${p.label} 的密钥还没填到 Vercel，暂用占位图。` };
  return { p, note: null };
}

/** 统一成 2:3（1024×1536）JPEG：有的服务出方图或别的比例，居中裁 */
export async function normalize(img: GenImage): Promise<Buffer> {
  return sharp(img.data, { failOn: 'none' }).resize(W, H, { fit: 'cover', position: 'centre' }).jpeg({ quality: 90 }).toBuffer();
}
