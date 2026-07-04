/**
 * POST /api/checkout —— 会员 / 战略合作伙伴在线申请 → 创建 Stripe Checkout Session。
 * ------------------------------------------------------------------
 * - 仅 POST。金额由服务端据 tiers.ts 解析，不信任客户端传价。
 * - 记录 ip / user-agent 到 agreement acceptance。
 * - 只返回安全错误信息，不泄露 DB / Stripe 内部错误或任何 secret。
 * - node runtime（pg + node:crypto 需要），force-dynamic（每次请求都执行）。
 */
import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/membership/checkout-service';
import type { CheckoutRequest } from '@/lib/membership/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json({ error: '请求格式有误。' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;
  const userAgent = req.headers.get('user-agent') || null;

  try {
    const result = await createCheckoutSession(body, { ip, userAgent });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ url: result.url });
  } catch (err) {
    // 只记录简短信息，绝不打印 secret / 完整堆栈中的连接串。
    console.error('[checkout] failed:', err instanceof Error ? err.message : 'unknown error');
    return NextResponse.json(
      { error: '暂时无法创建付款会话，请稍后再试或直接联系我们。' },
      { status: 500 }
    );
  }
}

// 非 POST 方法一律 405，避免暴露路由细节。
export async function GET(): Promise<Response> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
