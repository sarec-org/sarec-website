/**
 * /api/v1 公共工具：统一 JSON 返回、错误码、身份解析（cookie 或 Bearer）、工作人员权限。
 * 返回格式：成功 { ok: true, ...data }；失败 { ok: false, error: { code, message } }。
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CrmError } from './events';
import { SESSION_COOKIE, SESSION_DAYS, sessionContact, staffCan, staffFor, type Staff, type StaffRole } from './auth';

export function ok(data: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

const STATUS_BY_CODE: Record<string, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  too_soon: 429,
  too_many_attempts: 429,
  sms_unavailable: 503,
  email_unavailable: 503,
  wechat_unconfigured: 503,
  wx_error: 502,
  merge_needed: 409,
  already_checked_in: 409,
  conflict: 409
};

/** 包一层：CrmError → 对应状态码的大白话错误；其他异常 → 500（不泄露内部信息）。 */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof CrmError) return fail(e.code, e.message, STATUS_BY_CODE[e.code] ?? 400);
      console.error('[api/v1]', e instanceof Error ? e.message : 'unknown error');
      return fail('server_error', '系统忙，请稍后再试。您填写的内容还在页面上，不会丢。', 500);
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new CrmError('bad_request', '请求格式有误');
  }
}

export function tokenFrom(req: Request): string | null {
  const auth = req.headers.get('authorization');
  const m = auth?.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

export async function optionalContact(req: Request): Promise<string | null> {
  return sessionContact(tokenFrom(req));
}

export async function requireContact(req: Request): Promise<string> {
  const id = await optionalContact(req);
  if (!id) throw new CrmError('unauthorized', '请先登录（用邮箱或手机号收验证码即可）');
  return id;
}

export async function requireStaff(req: Request, role: StaffRole): Promise<Staff> {
  const id = await requireContact(req);
  const s = await staffFor(id);
  if (!staffCan(s, role)) throw new CrmError('forbidden', '您没有这个操作的权限，请联系管理员开通');
  return s!;
}

export function withSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600
  });
  return res;
}

export function siteUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && process.env.VERCEL_ENV === 'production') return env.replace(/\/$/, '');
  // 预览 / 本地：用请求自身的域名，避免跳回正式站
  const u = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? u.host;
  const proto = req.headers.get('x-forwarded-proto') ?? u.protocol.replace(':', '');
  return `${proto}://${host}`;
}
