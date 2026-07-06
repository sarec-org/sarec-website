/**
 * 管理员 token 校验（服务端）。
 * ------------------------------------------------------------------
 * - ADMIN_ACTION_TOKEN 只从 env 读，绝不写死、绝不入 URL、绝不打日志。
 * - 常量时间比较：先各自 sha256 成定长 32 字节再 timingSafeEqual，
 *   既恒定时间又不泄露 token 长度。
 * - 未配置 token 时一律拒绝（不允许无鉴权放行）。
 * - token 从 `Authorization: Bearer <token>` 头,或 httpOnly cookie(最小 admin session)取,不接受 query。
 */
import { createHash, timingSafeEqual } from 'node:crypto';

/** 最小 admin session:httpOnly + secure + sameSite cookie 名。token 不入 URL、不入前端公开代码。 */
export const ADMIN_COOKIE = 'sarec_admin';

function sha256(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest();
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_ACTION_TOKEN);
}

/** 裸 token 常量时间比对(cookie / login 用)。 */
export function verifyAdminToken(provided: string | null | undefined): boolean {
  const expected = process.env.ADMIN_ACTION_TOKEN;
  if (!expected || !provided) return false;
  const t = provided.trim();
  if (!t) return false;
  // sha256 定长比较：恒定时间，且不泄露长度差异。
  return timingSafeEqual(sha256(t), sha256(expected));
}

/** 从 Authorization 头取 Bearer token 并常量时间比对。 */
export function verifyAdminAuth(authorizationHeader: string | null): boolean {
  if (!authorizationHeader) return false;
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  return verifyAdminToken(m[1]);
}

/** 从 Cookie 头解析指定 cookie 值(不依赖框架)。 */
function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/** 接受 Bearer 头 或 httpOnly cookie 任一通过即放行。供 admin API 路由用。 */
export function verifyAdminRequest(req: Request): boolean {
  if (verifyAdminAuth(req.headers.get('authorization'))) return true;
  return verifyAdminToken(readCookie(req.headers.get('cookie'), ADMIN_COOKIE));
}
