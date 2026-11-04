/**
 * 微信订阅消息：活动提醒（开课前 1 天、前 2 小时）
 * ------------------------------------------------------------------
 * - 报名成功时小程序请用户允许“活动提醒”；每允许一次，可推送一条（一次性订阅）。
 * - 模板 ID 与字段在环境变量 WX_SUBSCRIBE_TEMPLATES（JSON）里配置，未配置时不请求、不发送：
 *   {"day_before":{"id":"模板ID","fields":{"title":"thing1","time":"time2","place":"thing3","note":"thing4"}},
 *    "two_hours": {"id":"模板ID","fields":{...}}}
 * - 由 /api/cron/event-reminders 每 15 分钟触发（GitHub Actions；Vercel 免费版定时任务一天只能一次）。
 * 密钥只从环境变量读，不打日志。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';

export type ReminderKind = 'day_before' | 'two_hours';
export const REMINDER_KINDS: ReminderKind[] = ['day_before', 'two_hours'];
type Tmpl = { id: string; fields: { title?: string; time?: string; place?: string; note?: string } };

export function subscribeTemplates(): Partial<Record<ReminderKind, Tmpl>> {
  try {
    const raw = JSON.parse(process.env.WX_SUBSCRIBE_TEMPLATES || '{}') as Record<string, Tmpl>;
    const out: Partial<Record<ReminderKind, Tmpl>> = {};
    for (const k of REMINDER_KINDS) if (raw[k]?.id && raw[k].fields) out[k] = raw[k];
    return out;
  } catch {
    return {};
  }
}

/** 给小程序：要请求的模板 ID（不是密钥） */
export function publicTemplateIds(): Record<ReminderKind, string | null> {
  const t = subscribeTemplates();
  return { day_before: t.day_before?.id ?? null, two_hours: t.two_hours?.id ?? null };
}

/** 小程序报名成功后调用：用户允许了哪些提醒（按模板 ID 或 kind）。 */
export async function saveSubscriptions(contactId: string, slug: string, accepted: string[]) {
  const pool = getPool();
  const t = subscribeTemplates();
  const kinds = REMINDER_KINDS.filter((k) => accepted.includes(k) || (t[k] && accepted.includes(t[k]!.id)));
  const { rows } = await pool.query<{ event_id: string; openid: string | null; status: string }>(
    `SELECT e.id AS event_id, c.wechat_openid AS openid, r.status
       FROM events e JOIN registrations r ON r.event_id = e.id AND r.contact_id = $2 JOIN contacts c ON c.id = $2
      WHERE e.slug = $1`,
    [slug, contactId]
  );
  const r = rows[0];
  if (!r || r.status === 'cancelled') throw new CrmError('not_registered', '请先报名这场活动');
  if (!r.openid) throw new CrmError('no_wechat', '活动提醒需要在小程序里开启');
  for (const k of kinds) {
    await pool.query(
      `INSERT INTO event_reminder_subs (event_id, contact_id, kind, openid) VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, contact_id, kind) DO UPDATE
         SET openid = EXCLUDED.openid, accepted_at = now(),
             status = CASE WHEN event_reminder_subs.status = 'failed' THEN 'pending' ELSE event_reminder_subs.status END`,
      [r.event_id, contactId, k, r.openid]
    );
  }
  return { saved: kinds };
}

// ── 发送 ────────────────────────────────────────────────────────────────
let cachedToken: { token: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const res = await fetch('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credential', appid: process.env.WX_APPID, secret: process.env.WX_SECRET })
  });
  const d = (await res.json()) as { access_token?: string; expires_in?: number; errcode?: number };
  if (!d.access_token) throw new Error(`wechat token error ${d.errcode ?? ''}`);
  cachedToken = { token: d.access_token, exp: Date.now() + (d.expires_in ?? 7200) * 1000 };
  return d.access_token;
}

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function fmtTime(d: Date, tz: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}年${p.month}月${p.day}日 ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

type Due = { id: string; kind: ReminderKind; openid: string; slug: string; title: string; starts_at: Date; timezone: string; location_name: string | null; address: string | null };

/** 定时任务：先把错过时机的标为跳过，再发到点的。返回发送统计。 */
export async function runEventReminders(now = new Date()): Promise<{ sent: number; failed: number; skipped: number; configured: boolean }> {
  const pool = getPool();
  const t = subscribeTemplates();
  // 错过时机 / 活动取消 / 已取消报名 / 前 1 天提醒在开课前不到 22 小时才订阅（有 2 小时提醒即可）
  const { rowCount: skipped } = await pool.query(
    `UPDATE event_reminder_subs s SET status = 'skipped'
       FROM events e
      WHERE s.event_id = e.id AND s.status = 'pending'
        AND (e.event_status <> 'scheduled'
             OR NOT EXISTS (SELECT 1 FROM registrations r WHERE r.event_id = e.id AND r.contact_id = s.contact_id AND r.status <> 'cancelled')
             OR (s.kind = 'day_before' AND ($1::timestamptz >= e.starts_at - interval '2 hours' OR s.accepted_at > e.starts_at - interval '22 hours'))
             OR (s.kind = 'two_hours' AND $1::timestamptz >= e.starts_at - interval '10 minutes'))`,
    [now]
  );
  const configured = !!(process.env.WX_APPID && process.env.WX_SECRET && (t.day_before || t.two_hours));
  if (!configured) return { sent: 0, failed: 0, skipped: skipped ?? 0, configured };
  const { rows: due } = await pool.query<Due>(
    `SELECT s.id, s.kind, s.openid, e.slug, e.title, e.starts_at, e.timezone, e.location_name, e.address
       FROM event_reminder_subs s JOIN events e ON e.id = s.event_id
      WHERE s.status = 'pending'
        AND ((s.kind = 'day_before' AND $1::timestamptz >= e.starts_at - interval '24 hours')
          OR (s.kind = 'two_hours' AND $1::timestamptz >= e.starts_at - interval '2 hours'))
      LIMIT 200`,
    [now]
  );
  let sent = 0;
  let failed = 0;
  for (const d of due) {
    const tm = t[d.kind];
    if (!tm) continue;
    // 先占位再发，防止并发重复推送
    const { rowCount } = await pool.query(`UPDATE event_reminder_subs SET status = 'sent', sent_at = now() WHERE id = $1 AND status = 'pending'`, [d.id]);
    if (!rowCount) continue;
    const values: Record<string, string> = {
      title: cut(d.title, 20),
      time: fmtTime(d.starts_at, d.timezone || 'America/Los_Angeles'),
      place: cut(d.location_name || d.address || '详见活动页', 20),
      note: d.kind === 'day_before' ? '活动明天开始，请准时参加' : '活动 2 小时后开始，请准时到场'
    };
    const data: Record<string, { value: string }> = {};
    for (const [k, key] of Object.entries(tm.fields)) if (key) data[key] = { value: values[k] };
    try {
      const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${await accessToken()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ touser: d.openid, template_id: tm.id, page: `pages/event/event?slug=${encodeURIComponent(d.slug)}`, data, miniprogram_state: 'formal', lang: 'zh_CN' })
      });
      const j = (await res.json()) as { errcode?: number };
      if (j.errcode) throw new Error(`errcode ${j.errcode}`);
      sent++;
    } catch (e) {
      failed++;
      await pool.query(`UPDATE event_reminder_subs SET status = 'failed', error = $2 WHERE id = $1`, [d.id, (e instanceof Error ? e.message : 'error').slice(0, 200)]);
    }
  }
  return { sent, failed, skipped: skipped ?? 0, configured };
}
