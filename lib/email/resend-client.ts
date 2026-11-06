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
    if (!isProduction()) guardNonProduction(client);
  }
  return client;
}

/** 正式站才真正对外发信；预览 / 本地只发给测试白名单（东哥 Gmail 及其 + 别名），其余拦下不发。 */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

/** PREVIEW_EMAIL_ALLOW：逗号分隔的测试收件人；a@b.com 同时放行 a+任意@b.com。未配置时全部拦截。 */
export function testRecipientAllowed(addr: string): boolean {
  const allow = (process.env.PREVIEW_EMAIL_ALLOW || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  const a = addr.trim().toLowerCase().replace(/^.*<([^>]+)>.*$/, '$1');
  const base = a.replace(/\+[^@]*@/, '@');
  return allow.some((x) => x === a || x === base);
}

function guardNonProduction(c: Resend) {
  const send = c.emails.send.bind(c.emails);
  (c.emails as { send: typeof send }).send = (async (payload: Parameters<typeof send>[0], options?: Parameters<typeof send>[1]) => {
    const list = (Array.isArray(payload.to) ? payload.to : [payload.to]).filter((x): x is string => typeof x === 'string');
    const kept = list.filter(testRecipientAllowed);
    if (!kept.length) {
      console.log('[email] non-production: blocked recipient (not in test allowlist)');
      return { data: { id: 'blocked-non-production' }, error: null };
    }
    return send({ ...payload, to: kept, cc: undefined, bcc: undefined } as Parameters<typeof send>[0], options);
  }) as typeof send;
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
