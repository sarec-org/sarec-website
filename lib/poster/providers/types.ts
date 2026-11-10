/** 画图服务统一接口：换服务商只换 POSTER_IMAGE_PROVIDER，不改主流程。密钥只从环境变量读。 */
export type GenImage = { data: Buffer; contentType: string };
export type ImageProvider = {
  key: string;
  label: string;
  model: string;
  /** 单张估算成本（美元，按服务商公开价）；免费额度内也照记，方便看如果超额会花多少 */
  costPerImage: number;
  configured: () => boolean;
  /** 环境变量填了但格式不对时，说明哪里不对（不含密钥本身）；没问题返回 null */
  problem?: () => string | null;
  /** 生成一张 2:3 竖图（约 1024×1536）。seed 用来让同一批 4 张不一样 */
  generate: (prompt: string, seed: number) => Promise<GenImage>;
};

export async function fetchJson(url: string, init: RequestInit, timeoutMs = 120_000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await r.text();
    let j: unknown = null;
    try { j = JSON.parse(text); } catch { /* 非 JSON */ }
    if (!r.ok) {
      const msg = (j as { error?: { message?: string } | string; errors?: { message?: string }[] } | null);
      const m = typeof msg?.error === 'string' ? msg.error : msg?.error?.message || msg?.errors?.[0]?.message || text.slice(0, 200);
      throw new Error(`画图服务返回 ${r.status}：${m}`);
    }
    return j;
  } finally {
    clearTimeout(t);
  }
}

/** 报错信息里去掉密钥：环境变量里的密钥原文、Bearer 后面的东西、Cloudflare 令牌样式 */
const SECRET_ENVS = ['CLOUDFLARE_AI_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'AI_GATEWAY_API_KEY', 'VERCEL_OIDC_TOKEN', 'GEMINI_API_KEY', 'POLLINATIONS_TOKEN', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
export function redactSecrets(msg: string): string {
  let out = msg;
  for (const k of SECRET_ENVS) {
    const v = process.env[k]?.trim();
    if (v && v.length >= 8) out = out.split(v).join('***');
    // 值里如果夹着一串长令牌（比如误粘贴了整条命令），把里面每一段长串也去掉
    for (const part of (v || '').match(/[A-Za-z0-9_\-.]{20,}/g) || []) out = out.split(part).join('***');
  }
  return out.replace(/Bearer\s+[^\s"'\\]+/gi, 'Bearer ***').replace(/\bcfut_[A-Za-z0-9_\-]+/g, '***');
}
