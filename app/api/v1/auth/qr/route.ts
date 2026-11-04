/** POST /api/v1/auth/qr —— 网站出扫码登录码；GET /api/v1/auth/qr?poll= —— 网站轮询（批准后写 cookie） */
import type { NextResponse } from 'next/server';
import { createQrLogin, pollQrLogin } from '@/lib/crm/auth';
import { fail, handler, ok, withSessionCookie } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async () => {
  const r = await createQrLogin();
  return ok({ code: r.code, poll: r.poll, expiresAt: r.expiresAt, scanText: `SAREC-LOGIN:${r.code}` });
});
export const GET = handler(async (req: Request) => {
  const poll = new URL(req.url).searchParams.get('poll');
  if (!poll) return fail('bad_request', '缺少参数');
  const r = await pollQrLogin(poll);
  const res = ok({ status: r.status }) as NextResponse;
  return r.token ? withSessionCookie(res, r.token) : res;
});
