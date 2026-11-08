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
    countSingleSends(client);
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
  // 批量发送（邮件通讯）同样只发给测试白名单；被拦下的给一个假 ID，保持和请求一一对应
  const batch = c.batch.send.bind(c.batch);
  (c.batch as { send: typeof batch }).send = (async (payload: Parameters<typeof batch>[0], options?: Parameters<typeof batch>[1]) => {
    const items = payload as { to: string | string[] }[];
    const allowed = items.map((p) => (Array.isArray(p.to) ? p.to : [p.to]).some((t) => typeof t === 'string' && testRecipientAllowed(t)));
    const keep = items.filter((_, i) => allowed[i]);
    let ids: { id: string }[] = [];
    if (keep.length) {
      const res = await batch(keep as Parameters<typeof batch>[0], options);
      if (res.error) return res;
      ids = ((res.data as { data?: { id: string }[] } | null)?.data ?? []) as { id: string }[];
    }
    if (keep.length < items.length) console.log(`[email] non-production: blocked ${items.length - keep.length} batch recipient(s)`);
    let k = 0;
    const data = allowed.map((ok, i) => (ok ? ids[k++] ?? { id: `blocked-${i}` } : { id: 'blocked-non-production' }));
    return { data: { data }, error: null } as unknown as Awaited<ReturnType<typeof batch>>;
  }) as typeof batch;
}

/**
 * 邮件通讯：每天实际发出的邮件数（所有邮件），用来控制在 Resend 现有套餐内。
 * 单封发送在这里自动计数；批量发送（邮件通讯）由调用方计数。计数失败不影响发信。
 */
export async function countSends(n: number, newsletter = false): Promise<void> {
  if (!n) return;
  try {
    const { getPool } = await import('@/lib/db/client');
    await getPool().query(
      `INSERT INTO email_send_counts (day, sent, newsletter) VALUES ((now() AT TIME ZONE 'America/Los_Angeles')::date, $1, $2)
       ON CONFLICT (day) DO UPDATE SET sent = email_send_counts.sent + EXCLUDED.sent, newsletter = email_send_counts.newsletter + EXCLUDED.newsletter`,
      [n, newsletter ? n : 0]
    );
  } catch {
    /* 迁移没跑或数据库暂时不可用：不影响发信 */
  }
}

function countSingleSends(c: Resend) {
  const send = c.emails.send.bind(c.emails);
  (c.emails as { send: typeof send }).send = (async (payload: Parameters<typeof send>[0], options?: Parameters<typeof send>[1]) => {
    const res = await send(payload, options);
    if (!res.error && res.data?.id !== 'blocked-non-production') await countSends(1);
    return res;
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
