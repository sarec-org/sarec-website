/**
 * 1.3 M：收费活动（私企面对面）付款流程——守住小程序合规：
 * - 小程序里只显示“收费活动 / 收费待确认”，不出现金额和付款方式；
 * - 小程序报名后，系统自动给本人发邮件（有短信发送号码时也发短信），附网站付款链接（Stripe 刷卡 / Zelle），付款在网站完成；
 * - 付款链接带签名（/zh/pay/<订单号>?t=<签名>），不用登录也能打开本人这张订单；
 * - 活动前 5 天还没付的，自动再发一次提醒（各一次）；到场没付的签到台现场 Zelle 扫码。
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getPool } from '@/lib/db/client';

// 没有任何密钥时直接报错（fail closed），绝不退回写死的值——否则谁都能伪造付款链接
function secret(): string {
  const s = process.env.PAY_LINK_SECRET || process.env.CRON_SECRET || process.env.AGENT_IP_SALT;
  if (!s) throw new Error('PAY_LINK_SECRET / CRON_SECRET 未配置，不能生成或校验付款链接');
  return s;
}

export function payToken(orderNo: string): string {
  return createHmac('sha256', secret()).update(`pay:${orderNo}`).digest('base64url').slice(0, 32);
}

export function payTokenOk(orderNo: string, t: string | null | undefined): boolean {
  if (!t) return false;
  let expected: string;
  try {
    expected = payToken(orderNo);
  } catch {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(String(t));
  return a.length === b.length && timingSafeEqual(a, b);
}

const base = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
export const payLink = (orderNo: string) => `${base()}/zh/pay/${orderNo}?t=${payToken(orderNo)}`;

export async function smsSend(to: string, text: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const svc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !tok || !(from || svc)) return false;
  const form = new URLSearchParams({ To: to, Body: text, ...(svc ? { MessagingServiceSid: svc } : { From: from! }) });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  }).catch(() => null);
  return !!res && res.ok;
}

type Row = { reg_id: string; order_no: string; amount_cents: number; title: string; starts_at: Date; name: string; email: string | null; phone: string | null };

async function rowFor(regId: string): Promise<Row | null> {
  const { rows } = await getPool().query<Row>(
    `SELECT r.id AS reg_id, o.order_no, o.amount_cents, e.title, e.starts_at, c.name,
            COALESCE(c.email, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'email' AND m.is_current LIMIT 1)) AS email,
            COALESCE(c.phone_e164, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.is_current LIMIT 1)) AS phone
       FROM registrations r JOIN events e ON e.id = r.event_id JOIN contacts c ON c.id = r.contact_id
       JOIN orders o ON o.contact_id = r.contact_id AND o.related_id = r.event_id AND o.purpose = 'event_fee' AND o.status NOT IN ('cancelled', 'paid')
      WHERE r.id = $1 AND r.status = 'registered'`,
    [regId]
  );
  return rows[0] ?? null;
}

async function deliver(r: Row, kind: 'link' | 'reminder'): Promise<{ email: boolean; sms: boolean }> {
  const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
  const when = new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(r.starts_at));
  const link = payLink(r.order_no);
  const amount = `$${(r.amount_cents / 100).toFixed(r.amount_cents % 100 ? 2 : 0)}`;
  const head = kind === 'link' ? `您已报名「${r.title}」（${when}）。本场为收费活动，费用 ${amount}。` : `「${r.title}」${when} 开始，您的报名费用 ${amount} 还没有付。`;
  const text = `${r.name || ''}您好，\n\n${head}\n请在网站完成付款（可刷卡或 Zelle）：\n${link}\n\n到账后报名会自动变成“已确认”。如果到场时还没付，也可以在签到台用 Zelle 扫码付。\n\n中美房地产商会 SAREC`;
  let email = false;
  let sms = false;
  if (r.email && isEmailConfigured()) {
    const res = await getResend().emails.send({ from: getFromAddress(), to: r.email, subject: `【SAREC】${r.title}：${kind === 'link' ? '请完成付款' : '付款提醒'}`, text });
    email = !res.error;
  }
  if (r.phone) sms = await smsSend(r.phone, `SAREC：${head}付款链接 ${link}`);
  return { email, sms };
}

/** 小程序报名收费活动后调用：发一次付款链接（已发过不再发） */
export async function sendPayLinkOnce(regId: string) {
  const pool = getPool();
  const { rows } = await pool.query(`UPDATE registrations SET pay_link_sent_at = now() WHERE id = $1 AND pay_link_sent_at IS NULL RETURNING id`, [regId]);
  if (!rows[0]) return { sent: false, reason: 'already' };
  const r = await rowFor(regId);
  if (!r) return { sent: false, reason: 'no_unpaid_order' };
  const d = await deliver(r, 'link').catch(() => ({ email: false, sms: false }));
  if (!d.email && !d.sms) {
    // 没送到：清掉“已发”标记（以后可以重发），异常里写清楚原因；工作人员在活动详情页可以复制付款链接发给本人
    await pool.query(`UPDATE registrations SET pay_link_sent_at = NULL WHERE id = $1`, [regId]);
    const why = !r.email && !r.phone ? '本人没有留邮箱和手机' : r.email ? '付款链接邮件发送失败' : '本人只留了手机，短信没有发出（未配置短信发送号码或发送失败）';
    const { recordException } = await import('./followups');
    await recordException('pay_link', `pay_link:${regId}`, regId, `${why}，付款链接没有送到本人。请在后台活动详情页点“复制付款链接”发给本人`).catch(() => undefined);
  }
  return { sent: d.email || d.sms, ...d };
}

/** 每天的定时任务：活动前 5 天（4–5.5 天内开始）还没付的，提醒一次 */
export async function runPayReminders(now: Date = new Date()) {
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT r.id FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE e.fee_cents > 0 AND e.event_status = 'scheduled' AND r.status = 'registered' AND r.pay_reminded_at IS NULL
        AND e.starts_at > $1::timestamptz + interval '4 days' AND e.starts_at <= $1::timestamptz + interval '5 days 12 hours'
        AND EXISTS (SELECT 1 FROM orders o WHERE o.contact_id = r.contact_id AND o.related_id = r.event_id AND o.purpose = 'event_fee' AND o.status NOT IN ('cancelled', 'paid'))`,
    [now]
  );
  let sent = 0;
  for (const x of rows) {
    await getPool().query(`UPDATE registrations SET pay_reminded_at = now() WHERE id = $1`, [x.id]);
    const r = await rowFor(x.id);
    if (r && Object.values(await deliver(r, 'reminder')).some(Boolean)) sent++;
  }
  return { candidates: rows.length, sent };
}
