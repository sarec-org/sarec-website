/**
 * 每天检查一次 Twilio 余额，低于 $10 发邮件提醒（收件人 SAREC_ALERT_EMAIL，未配置时用 SAREC_ADMIN_EMAIL）。
 * 由 /api/cron/event-reminders（每 15 分钟）顺带调用；按洛杉矶日期每天只查一次、只发一封。
 * 密钥只从环境变量读，不打日志。
 */
import { getPool } from '@/lib/db/client';
import { getAdminEmail, getFromAddress, getResend, isEmailConfigured } from '@/lib/email/resend-client';

export const LOW_BALANCE_USD = 10;

function laDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);
}

export async function fetchTwilioBalance(): Promise<{ balance: number; currency: string } | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Balance.json`, {
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}` }
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { balance?: string; currency?: string };
    const n = Number(d.balance);
    return Number.isFinite(n) ? { balance: n, currency: d.currency ?? 'USD' } : null;
  } catch {
    return null;
  }
}

/** 今天还没查过才查；返回本次结果（今天已查过返回 skipped）。 */
export async function checkTwilioBalanceDaily(
  now = new Date()
): Promise<{ status: 'skipped' | 'unconfigured' | 'ok' | 'low' | 'error'; balance?: number; alerted?: boolean }> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return { status: 'unconfigured' };
  const today = laDate(now);
  const pool = getPool();
  // 先占当天：同一天多次触发只查一次
  const { rows } = await pool.query(
    `INSERT INTO crm_settings (key, value, updated_by, updated_at) VALUES ('twilio_balance_check', $1, 'system', now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
       WHERE crm_settings.value->>'date' IS DISTINCT FROM $2
     RETURNING key`,
    [JSON.stringify({ date: today }), today]
  );
  if (!rows[0]) return { status: 'skipped' };
  const b = await fetchTwilioBalance();
  if (!b) {
    // 查询失败：放开当天占位，下一次触发再试
    await pool.query(`UPDATE crm_settings SET value = '{}'::jsonb WHERE key = 'twilio_balance_check'`);
    return { status: 'error' };
  }
  await pool.query(`UPDATE crm_settings SET value = $1 WHERE key = 'twilio_balance_check'`, [
    JSON.stringify({ date: today, balance: b.balance, currency: b.currency })
  ]);
  if (b.balance >= LOW_BALANCE_USD) return { status: 'ok', balance: b.balance };
  const to = process.env.SAREC_ALERT_EMAIL?.trim() || getAdminEmail();
  let alerted = false;
  if (to && isEmailConfigured()) {
    const amt = b.currency === 'USD' ? `$${b.balance.toFixed(2)}` : `${b.balance.toFixed(2)} ${b.currency}`;
    const res = await getResend()
      .emails.send({
        from: getFromAddress(),
        to,
        subject: `【提醒】Twilio 短信余额不足：${amt}`,
        text: `Twilio 账户余额现在是 ${amt}，低于 $${LOW_BALANCE_USD}。\n余额用完后短信验证码会发不出（页面会提示用户改用邮箱验证）。\n请到 Twilio 控制台 → Billing 充值，或确认自动充值是否正常。\n\nSAREC 系统自动提醒（每天检查一次）`
      })
      .catch(() => null);
    alerted = !!res && !res.error;
  }
  return { status: 'low', balance: b.balance, alerted };
}
