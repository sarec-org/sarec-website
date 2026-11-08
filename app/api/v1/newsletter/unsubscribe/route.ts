/**
 * 邮件通讯退订（不需要登录，凭邮件里的退订编号）。
 * POST ?t=… —— 邮箱客户端的“一键退订”（List-Unsubscribe-Post），立即生效
 * POST { t, action?: 'resubscribe' } —— 退订页（点链接后自动退订；也能重新订阅）
 */
import { NextResponse } from 'next/server';
import { handler, ok } from '@/lib/crm/http';
import { resubscribe, unsubscribe } from '@/lib/crm/newsletter';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const q = new URL(req.url).searchParams.get('t');
  if (q) {
    await unsubscribe(q);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const b = (await req.json().catch(() => ({}))) as { t?: string; action?: string };
  return ok(b.action === 'resubscribe' ? await resubscribe(String(b.t ?? '')) : await unsubscribe(String(b.t ?? '')));
});
