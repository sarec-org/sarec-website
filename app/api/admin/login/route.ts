/**
 * POST /api/admin/login —— 最小 admin session。
 * ------------------------------------------------------------------
 * - POST { token } → 校验 = ADMIN_ACTION_TOKEN → 写 httpOnly + secure + sameSite=strict cookie。
 * - DELETE → 清 cookie(登出)。
 * - token 只在请求体里,绝不入 URL、不打日志、不回显;成功/失败都只回 { ok }。
 * - 未配置 ADMIN_ACTION_TOKEN → 503,不允许无鉴权。
 */
import { NextResponse } from 'next/server';
import { verifyAdminToken, isAdminConfigured, ADMIN_COOKIE } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AGE = 60 * 60 * 12; // 12h

export async function POST(req: Request): Promise<Response> {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'admin not configured' }, { status: 503 });
  }
  let token: unknown;
  try {
    token = ((await req.json()) as Record<string, unknown>)?.token;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (typeof token !== 'string' || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE
  });
  return res;
}

export async function DELETE(): Promise<Response> {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });
  return res;
}
