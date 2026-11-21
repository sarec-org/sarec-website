/**
 * 后台综合优化：通知总闸 notify_live（所有“新加的对外发送”都走这里）。
 * ------------------------------------------------------------------
 * - 总闸是 crm_settings.notify_live，正式环境默认关（迁移 0040 写 false）。打开要东哥点头。
 * - 关着：只记录“本该发什么、发给谁（打码）”，一条都不真发。
 * - 开着 + 测试站 / 本地：只发给测试身份（测试号码名单、PREVIEW_SMS_ALLOW、PREVIEW_EMAIL_ALLOW、test_wecom_userids），其余只记录。
 * - 开着 + 正式站：真发。
 * - 每一条都写 notify_log（收件人只存打码后的）。
 * - 没配置的渠道（短信、邮件、企业微信）自动不用：记成 failed，原因写清楚，调用方可改用别的渠道。
 * 用法：await gateSend({ purpose: 'join_link', audience: 'customer', channel: 'sms', to: '+1…', text: '…', ref: id })
 */
import { getPool } from '@/lib/db/client';
import { getSetting, setSetting } from './orders';
import { maskEmail, maskPhone } from './contactInfo';

export type GateChannel = 'sms' | 'email' | 'wecom';
export type GateMessage = {
  purpose: string;
  audience?: 'customer' | 'staff';
  channel: GateChannel;
  to: string;
  subject?: string | null;
  text: string;
  ref?: string | null;
};
export type GateResult = { status: 'sent' | 'logged' | 'failed'; reason: string | null; logId: number };

export const NOT_LIVE_REASON = '通知总闸关着：只记录，没有真发';
export const TEST_ONLY_REASON = '测试站只发测试身份：这个收件人不是测试身份，只记录';

export function isProductionEnv(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

export async function notifyLive(): Promise<boolean> {
  const v = await getSetting<unknown>(getPool(), 'notify_live', false).catch(() => false);
  return v === true || v === 'true';
}

/** 只给管理员在后台用（打开要东哥点头）。 */
export async function setNotifyLive(on: boolean, by: string): Promise<void> {
  await setSetting(getPool(), 'notify_live', !!on, by);
}

export function maskTo(channel: GateChannel, to: string): string {
  if (channel === 'email') return maskEmail(to);
  if (channel === 'sms') return maskPhone(to);
  const s = String(to);
  return s.length <= 2 ? '**' : `${s.slice(0, 1)}***${s.slice(-1)}`;
}

/** 测试身份：测试号码（555-01xx、测试库名单、PREVIEW_SMS_ALLOW）、测试邮箱（PREVIEW_EMAIL_ALLOW）、测试企业微信成员（test_wecom_userids） */
export async function isTestIdentity(channel: GateChannel, to: string): Promise<boolean> {
  if (channel === 'sms') {
    const { testPhoneAllowed } = await import('./testPhones');
    if (await testPhoneAllowed(to).catch(() => false)) return true;
    const allow = (process.env.PREVIEW_SMS_ALLOW || '').split(',').map((x) => x.trim()).filter(Boolean);
    return allow.includes(to);
  }
  if (channel === 'email') {
    const { testRecipientAllowed } = await import('@/lib/email/resend-client');
    return testRecipientAllowed(to);
  }
  const list = await getSetting<unknown>(getPool(), 'test_wecom_userids', []).catch(() => []);
  return Array.isArray(list) && list.map(String).includes(to);
}

// ── 真正的发送（可在测试里替换）───────────────────────────────────────────
type Transport = (m: GateMessage) => Promise<{ ok: boolean; reason?: string }>;

export function wecomAppConfigured(): boolean {
  // 企业微信“应用消息”：需要企业 ID + 应用 AgentId + 应用 Secret；没配置时自动不用（改走短信）
  return !!(process.env.WECOM_CORP_ID && process.env.WECOM_AGENT_ID && process.env.WECOM_AGENT_SECRET);
}

const realTransport: Transport = async (m) => {
  if (m.channel === 'sms') {
    const { smsSend } = await import('./payLinks');
    const ok = await smsSend(m.to, m.text);
    return ok ? { ok } : { ok, reason: '短信没发出去（短信服务未配置或号码有误）' };
  }
  if (m.channel === 'email') {
    const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
    if (!isEmailConfigured()) return { ok: false, reason: '邮件服务未配置' };
    const res = await getResend().emails.send({ from: getFromAddress(), to: m.to, subject: m.subject || 'SAREC 通知', text: m.text });
    return res.error ? { ok: false, reason: '邮件没发出去' } : { ok: true };
  }
  if (!wecomAppConfigured()) return { ok: false, reason: '企业微信应用消息没配置' };
  try {
    const tokRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(process.env.WECOM_CORP_ID!)}&corpsecret=${encodeURIComponent(process.env.WECOM_AGENT_SECRET!)}`);
    const tok = (await tokRes.json()) as { access_token?: string };
    if (!tok.access_token) return { ok: false, reason: '企业微信取令牌失败' };
    const r = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${tok.access_token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ touser: m.to, msgtype: 'text', agentid: Number(process.env.WECOM_AGENT_ID), text: { content: m.text } })
    });
    const d = (await r.json()) as { errcode?: number };
    return d.errcode ? { ok: false, reason: `企业微信发送失败（${d.errcode}）` } : { ok: true };
  } catch {
    return { ok: false, reason: '企业微信发送失败' };
  }
};

let transport: Transport = realTransport;
/** 测试用：换成假的发送（记下“真发了”的消息） */
export function setTransportForTest(t: Transport | null) {
  transport = t ?? realTransport;
}

async function log(m: GateMessage, status: GateResult['status'], reason: string | null, live: boolean): Promise<number> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO notify_log (purpose, audience, channel, to_masked, subject, body, status, reason, ref, live)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [m.purpose, m.audience ?? 'customer', m.channel, maskTo(m.channel, m.to), m.subject ?? null, m.text.slice(0, 2000), status, reason, m.ref ?? null, live]
  );
  return Number(rows[0].id);
}

/** 所有新加的对外发送都走这里。 */
export async function gateSend(m: GateMessage): Promise<GateResult> {
  const live = await notifyLive();
  if (!live) return { status: 'logged', reason: NOT_LIVE_REASON, logId: await log(m, 'logged', NOT_LIVE_REASON, false) };
  if (!isProductionEnv() && !(await isTestIdentity(m.channel, m.to))) {
    return { status: 'logged', reason: TEST_ONLY_REASON, logId: await log(m, 'logged', TEST_ONLY_REASON, true) };
  }
  const r = await transport(m).catch(() => ({ ok: false, reason: '发送出错' }));
  const status = r.ok ? 'sent' : 'failed';
  const reason = r.ok ? null : r.reason ?? '发送失败';
  return { status, reason, logId: await log(m, status, reason, true) };
}

/** 后台“通知记录”：最近的（收件人已打码） */
export async function recentNotifyLog(limit = 100, purpose?: string | null) {
  const { rows } = await getPool().query(
    `SELECT id, purpose, audience, channel, to_masked, subject, body, status, reason, live, created_at
       FROM notify_log WHERE ($2::text IS NULL OR purpose = $2) ORDER BY created_at DESC LIMIT $1`,
    [limit, purpose ?? null]
  );
  return rows;
}
