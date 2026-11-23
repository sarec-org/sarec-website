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
  // 指令 52：推送每次收到都留一条日志（不含个人信息），方便只读排查
  if (!verify(sp)) {
    console.info(`[wx-push] bad signature has_sig=${sp.has('signature')} has_ts=${sp.has('timestamp')} token_set=${!!process.env.WX_PUSH_TOKEN}`);
    return new Response('bad signature', { status: 403 });
  }
  const raw = await req.text().catch(() => '');
  let b: { Event?: string; MsgType?: string; trace_id?: string; errcode?: number; result?: { suggest?: string; label?: number } } | null = null;
  try {
    b = JSON.parse(raw);
  } catch {
    b = null;
  }
  if (!b) {
    console.info(`[wx-push] body not json len=${raw.length} head=${raw.slice(0, 20).replace(/[^<>a-zA-Z_ ]/g, '')}`);
    return new Response('success', { headers: { 'Content-Type': 'text/plain' } });
  }
  let handled = 'ignored';
  if (b.Event === 'wxa_media_check' && b.trace_id) {
    const r = await handleMediaCheckResult(b.trace_id, b.result?.suggest ?? 'pass', b.result?.label ?? null);
    handled = r.ok ? (r.takenDown ? 'found-takendown' : 'found') : 'trace-not-found';
  }
  console.info(`[wx-push] event=${b.Event ?? b.MsgType ?? '?'} trace=${b.trace_id ? b.trace_id.slice(0, 12) : 'none'} errcode=${b.errcode ?? 0} suggest=${b.result?.suggest ?? '-'} handled=${handled}`);
  return new Response('success', { headers: { 'Content-Type': 'text/plain' } });
}
