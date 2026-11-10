/** 画图服务统一接口：换服务商只换 POSTER_IMAGE_PROVIDER，不改主流程。密钥只从环境变量读。 */
export type GenImage = { data: Buffer; contentType: string };
export type ImageProvider = {
  key: string;
  label: string;
  model: string;
  /** 单张估算成本（美元，按服务商公开价）；免费额度内也照记，方便看如果超额会花多少 */
  costPerImage: number;
  configured: () => boolean;
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
