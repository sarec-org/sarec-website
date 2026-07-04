/**
 * Resend 邮件客户端（服务端专用）。
 * ------------------------------------------------------------------
 * - RESEND_API_KEY 只从 env 读，绝不写死；懒加载，缺 key 抛错。
 * - 发件地址 SAREC_FROM_EMAIL；未配置时回退 Resend 测试发件地址（仅本地测试）。
 *   ⚠️ 上线前必须验证 @sinoamericanrec.org 发信域名，生产发件人建议
 *   `SAREC <no-reply@sinoamericanrec.org>`；测试回退不可当生产配置。
 * - 仅 server import；不进客户端 bundle。
 */
import { Resend } from 'resend';

let client: Resend | undefined;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not set');
  }
  if (!client) {
    client = new Resend(key);
  }
  return client;
}

/** 发件地址；未配置时回退 Resend 测试发件（仅本地）。 */
export function getFromAddress(): string {
  const from = process.env.SAREC_FROM_EMAIL;
  return from && from.trim() ? from.trim() : 'SAREC <onboarding@resend.dev>';
}

/** 管理员收件地址；未配置返回 null（则不发管理员通知）。 */
export function getAdminEmail(): string | null {
  const e = process.env.SAREC_ADMIN_EMAIL;
  return e && e.trim() ? e.trim() : null;
}
