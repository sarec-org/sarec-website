/** POST /api/v1/auth/logout */
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, destroySession } from '@/lib/crm/auth';
import { handler, tokenFrom } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const t = tokenFrom(req);
  if (t) await destroySession(t);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
