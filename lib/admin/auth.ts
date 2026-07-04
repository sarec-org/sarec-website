/**
 * 管理员 token 校验（服务端）。
 * ------------------------------------------------------------------
 * - ADMIN_ACTION_TOKEN 只从 env 读，绝不写死、绝不入 URL、绝不打日志。
 * - 常量时间比较：先各自 sha256 成定长 32 字节再 timingSafeEqual，
 *   既恒定时间又不泄露 token 长度。
 * - 未配置 token 时一律拒绝（不允许无鉴权放行）。
 * - token 从 `Authorization: Bearer <token>` 头取，不接受 query。
 */
import { createHash, timingSafeEqual } from 'node:crypto';

function sha256(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest();
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_ACTION_TOKEN);
}

/** 从 Authorization 头取 Bearer token 并常量时间比对。 */
export function verifyAdminAuth(authorizationHeader: string | null): boolean {
  const expected = process.env.ADMIN_ACTION_TOKEN;
  if (!expected || !authorizationHeader) return false;
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const provided = m[1].trim();
  if (!provided) return false;
  // sha256 定长比较：恒定时间，且不泄露长度差异。
  return timingSafeEqual(sha256(provided), sha256(expected));
}
