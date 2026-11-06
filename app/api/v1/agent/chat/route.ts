/** POST /api/v1/agent/chat { message, conversationId?, context?: { page, slug?, title? }, turnstileToken?, website? }
 *  → { reply, tier, route, actions?, conversationId, needTurnstile?, retryAfter? }
 *  商会 AI 助手：只有访客发消息时才可能调用模型（见 lib/agent/engine.ts）。 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { body, denyMiniProgram, handler } from '@/lib/crm/http';
import { VISITOR_COOKIE, handleChat, type ChatRequest } from '@/lib/agent/engine';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const POST = handler(async (req: Request) => {
  await denyMiniProgram(req); // 小程序不提供 AI 功能
  const b = await body<ChatRequest>(req);
  const r = await handleChat(req, b, cookies().get(VISITOR_COOKIE)?.value);
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (r.status === 429 && r.body.retryAfter) headers['Retry-After'] = String(r.body.retryAfter);
  const res = NextResponse.json(r.body, { status: r.status, headers });
  if (r.newVisitor) {
    res.cookies.set(VISITOR_COOKIE, r.visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 3600
    });
  }
  return res;
});
