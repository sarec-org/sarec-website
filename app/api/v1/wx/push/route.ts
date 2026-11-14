/**
 * 1.5.0 微信小程序「消息推送」回调（明文模式、JSON 格式）：
 * - GET：微信配置服务器地址时的校验（signature = sha1(排序后的 Token、timestamp、nonce)），通过就原样返回 echostr。
 * - POST：图片内容检测结果（Event = wxa_media_check）。不通过的自动撤下。
 * Token 只放在 Vercel 环境变量 WX_PUSH_TOKEN，和微信后台填的一样（东哥配置时两边填同一个）。
 */
import { createHash } from 'node:crypto';
import { handleMediaCheckResult } from '@/lib/crm/mediaCheck';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verify(sp: URLSearchParams): boolean {
  const token = process.env.WX_PUSH_TOKEN;
  if (!token) return false;
  const sig = sp.get('signature') ?? '';
  const arr = [token, sp.get('timestamp') ?? '', sp.get('nonce') ?? ''].sort();
  return createHash('sha1').update(arr.join('')).digest('hex') === sig;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  if (!verify(sp)) return new Response('bad signature', { status: 403 });
  return new Response(sp.get('echostr') ?? '', { headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(req: Request) {
  const sp = new URL(req.url).searchParams;
  if (!verify(sp)) return new Response('bad signature', { status: 403 });
  const b = (await req.json().catch(() => null)) as { Event?: string; trace_id?: string; result?: { suggest?: string; label?: number } } | null;
  if (b?.Event === 'wxa_media_check' && b.trace_id) await handleMediaCheckResult(b.trace_id, b.result?.suggest ?? 'pass', b.result?.label ?? null);
  return new Response('success', { headers: { 'Content-Type': 'text/plain' } });
}
