/**
 * POST /api/stripe/webhook —— Stripe webhook 入口（M4）。
 * ------------------------------------------------------------------
 * - 用 raw body + stripe-signature 头 + STRIPE_WEBHOOK_SECRET 验签（App Router 必须取原始 body）。
 * - 验签失败 → 400；配置缺失 → 500（Stripe 会重试）；已处理/已忽略 → 200。
 * - 业务处理与幂等在 lib/membership/webhook-service.ts。
 * - 只记录简短日志，绝不打印 secret / 签名 / 完整 body。
 * - node runtime（需 crypto/pg），force-dynamic，不缓存。
 */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { processStripeEvent } from '@/lib/membership/webhook-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY || !process.env.DATABASE_URL) {
    console.error('[webhook] missing config (STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY / DATABASE_URL)');
    // 500 → Stripe 会重试，等配置就绪后成功。
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  // App Router：必须用原始 body 文本验签，不能先 req.json()。
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    const result = await processStripeEvent(event);
    // processed / skipped / ignored / failed 均已在 DB 留档；返回 200 表示已受理，避免无意义重试。
    return NextResponse.json({ received: true, outcome: result.outcome }, { status: 200 });
  } catch (err) {
    // 仅未预期错误（如 DB 暂时不可用）走到这里 → 500 让 Stripe 重试。
    console.error('[webhook] processing error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'processing error' }, { status: 500 });
  }
}
