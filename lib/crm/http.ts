/**
 * /api/v1 公共工具：统一 JSON 返回、错误码、身份解析（cookie 或 Bearer）、工作人员权限。
 * 返回格式：成功 { ok: true, ...data }；失败 { ok: false, error: { code, message } }。
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CrmError } from './events';
import { SESSION_COOKIE, SESSION_DAYS, sessionContact, sha256, staffCan, staffFor, type Staff, type StaffRole } from './auth';
import { getPool } from '@/lib/db/client';

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

/**
 * 是不是 1.2 小程序的请求：带 X-Sarec-Client: mp-1.2 头，或这个会话曾经被 1.2 用过（标记会话，之后不带头也算）。
 * 1.2 的会话一律不返回订单、金额、付款方式（合规：小程序不出现付费引导）。
 */
// 1.2 及以后的小程序（mp-1.2、mp-1.3……）都按 1.2 的合规规则处理
const NEW_MP = /^mp-1\.([2-9]|\d{2,})(\b|$)/;
export async function isMp12(req: Request): Promise<boolean> {
  const token = tokenFrom(req);
  const header = (req.headers.get('x-sarec-client') ?? '').toLowerCase();
  if (!token) return NEW_MP.test(header);
  const hash = sha256(token);
  try {
    if (NEW_MP.test(header)) {
      await getPool().query(`UPDATE sessions SET client = 'mp-1.2' WHERE token_hash = $1 AND client IS DISTINCT FROM 'mp-1.2'`, [hash]);
      return true;
    }
    const { rows } = await getPool().query<{ client: string | null }>(`SELECT client FROM sessions WHERE token_hash = $1`, [hash]);
    return rows[0]?.client === 'mp-1.2';
  } catch {
    // 迁移还没跑（没有 client 列）：只看请求头
    return NEW_MP.test(header);
  }
}

/** 付款、订单、会议室下单、月卡、入会报价：1.2 小程序不提供（请到网站办理） */
/** 商会 AI 助手只在网站上提供：任何小程序来源（1.2 版本头 / 1.2 会话 / 微信小程序请求的 servicewechat.com Referer）一律拒绝 */
export async function denyMiniProgram(req: Request): Promise<void> {
  const referer = (req.headers.get('referer') ?? '').toLowerCase();
  const fromMp = referer.startsWith('https://servicewechat.com/') || (await isMp12(req));
  if (fromMp) throw new CrmError('forbidden', '小程序不提供 AI 助手功能');
}

export async function denyMp12(req: Request): Promise<void> {
  if (await isMp12(req)) throw new CrmError('forbidden', '这项服务请在商会网站办理，或联系商会工作人员');
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


/** 1.3：订单页的身份——已登录用本人；邮件 / 短信里的付款链接带签名 ?t=，不用登录也能打开本人这张订单 */
export async function orderContact(req: Request, orderNo: string): Promise<string> {
  const t = new URL(req.url).searchParams.get('t') || req.headers.get('x-pay-token');
  if (t) {
    const { payTokenOk } = await import('./payLinks');
    if (payTokenOk(orderNo, t)) {
      const { rows } = await getPool().query<{ contact_id: string }>(`SELECT contact_id FROM orders WHERE order_no = $1`, [orderNo]);
      if (rows[0]) return rows[0].contact_id;
    }
  }
  return requireContact(req);
}


/** 运营或现场签到人员（1.3 筹备清单：工作人员在现场用手机打勾） */
export async function requireStaffAny(req: Request, roles: StaffRole[]): Promise<Staff> {
  const id = await requireContact(req);
  const s = await staffFor(id);
  if (!s || !roles.some((r) => staffCan(s, r))) throw new CrmError('forbidden', '您没有这个操作的权限，请联系管理员开通');
  return s;
}
