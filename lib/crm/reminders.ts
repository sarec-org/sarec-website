/**
 * 微信订阅消息：报名成功确认 + 活动开始提醒（开课前 1 天、前 2 小时）
 * ------------------------------------------------------------------
 * - 一次性订阅：用户每允许一次，该模板可推送一条。报名时一次请求两个模板（确认通知、开始提醒）。
 * - 开始提醒要推两次（前 1 天、前 2 小时），但一次授权只够一条：先给“前 2 小时”；
 *   同一场活动再允许一次（报名成功页“开启提醒”）才补上“前 1 天”。
 * - 模板 ID 与字段在环境变量 WX_SUBSCRIBE_TEMPLATES（JSON）里配置，未配置时不请求、不发送：
 *   {"confirm": {"id":"模板ID","fields":{"title":"thing1","time":"time2","place":"thing6","note":"thing5"}},
 *    "reminder":{"id":"模板ID","fields":{"title":"thing4","time":"time2","place":"thing5","note":"thing3"}}}
 *   （旧写法 day_before / two_hours 分别配也认。）
 * - 确认通知在报名后立即推；提醒由 /api/cron/event-reminders 每 15 分钟触发（GitHub Actions）。
 * 密钥只从环境变量读，不打日志。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';

export type ReminderKind = 'day_before' | 'two_hours';
export type SubKind = 'confirm' | ReminderKind;
export const REMINDER_KINDS: ReminderKind[] = ['day_before', 'two_hours'];
type Tmpl = { id: string; fields: { title?: string; time?: string; place?: string; note?: string } };

/** 备注栏文案 */
export const NOTES: Record<SubKind, string> = {
  confirm: '报名成功，请准时参加',
  day_before: '明天开讲，请准时到场',
  two_hours: '2 小时后开始'
};

export function subscribeTemplates(): Partial<Record<SubKind, Tmpl>> {
  try {
    const raw = JSON.parse(process.env.WX_SUBSCRIBE_TEMPLATES || '{}') as Record<string, Tmpl>;
    const valid = (x?: Tmpl) => (x?.id && x.fields ? x : undefined);
    const out: Partial<Record<SubKind, Tmpl>> = {};
    const confirm = valid(raw.confirm);
    const day = valid(raw.day_before) ?? valid(raw.reminder);
    const two = valid(raw.two_hours) ?? valid(raw.reminder);
    if (confirm) out.confirm = confirm;
    if (day) out.day_before = day;
    if (two) out.two_hours = two;
    return out;
  } catch {
    return {};
  }
}

/** 给小程序：要请求的模板 ID（不是密钥）。小程序 1.1.0 只读 day_before / two_hours 两格并一次请求，
 *  所以这两格放“要请求的两个不同模板”：确认通知 + 开始提醒。新版读 confirm / reminder。 */
export function publicTemplateIds() {
  const t = subscribeTemplates();
  const confirm = t.confirm?.id ?? null;
  const reminder = t.two_hours?.id ?? t.day_before?.id ?? null;
  const shared = !!t.day_before && t.day_before.id === t.two_hours?.id;
  return {
    confirm,
    reminder,
    day_before: shared || !t.day_before ? confirm : t.day_before.id,
    two_hours: t.two_hours?.id ?? null
  };
}

type RegRow = {
  event_id: string; openid: string | null; status: string; slug: string; title: string;
  starts_at: Date; timezone: string; location_name: string | null; address: string | null;
};

/** 小程序报名成功后调用：用户允许了哪些模板（模板 ID，或 'confirm' / 'day_before' / 'two_hours'）。 */
export async function saveSubscriptions(contactId: string, slug: string, accepted: string[]) {
  const pool = getPool();
  const t = subscribeTemplates();
  const { rows } = await pool.query<RegRow>(
    `SELECT e.id AS event_id, c.wechat_openid AS openid, r.status, e.slug, e.title, e.starts_at, e.timezone, e.location_name, e.address
       FROM events e JOIN registrations r ON r.event_id = e.id AND r.contact_id = $2 JOIN contacts c ON c.id = $2
      WHERE e.slug = $1`,
    [slug, contactId]
  );
  const r = rows[0];
  if (!r || r.status === 'cancelled') throw new CrmError('not_registered', '请先报名这场活动');
  if (!r.openid) throw new CrmError('no_wechat', '活动提醒需要在小程序里开启');

  const has = (k: SubKind) => accepted.includes(k) || (!!t[k] && accepted.includes(t[k]!.id));
  const kinds: SubKind[] = [];
  if (has('confirm')) kinds.push('confirm');
  const shared = !!t.day_before && !!t.two_hours && t.day_before.id === t.two_hours.id;
  if (shared && accepted.includes(t.two_hours!.id)) {
    // 同一个模板只授权了一次：先占“前 2 小时”，已有再补“前 1 天”
    const { rows: ex } = await pool.query<{ kind: string }>(
      `SELECT kind FROM event_reminder_subs WHERE event_id = $1 AND contact_id = $2 AND status IN ('pending','sent')`,
      [r.event_id, contactId]
    );
    const taken = new Set(ex.map((x) => x.kind));
    if (!taken.has('two_hours')) kinds.push('two_hours');
    else if (!taken.has('day_before')) kinds.push('day_before');
  } else {
    for (const k of REMINDER_KINDS) if (has(k)) kinds.push(k);
  }

  let confirmSent = false;
  for (const k of kinds) {
    if (k === 'confirm') {
      // 确认通知每场只推一次
      const ins = await pool.query<{ id: string }>(
        `INSERT INTO event_reminder_subs (event_id, contact_id, kind, openid) VALUES ($1, $2, 'confirm', $3)
         ON CONFLICT (event_id, contact_id, kind) DO NOTHING RETURNING id`,
        [r.event_id, contactId, r.openid]
      );
      const id = ins.rows[0]?.id;
      if (!id) continue;
      if (r.status !== 'registered' || !t.confirm || !wxConfigured()) {
        // 候补中 / 未配置：不推“报名成功”
        await pool.query(`UPDATE event_reminder_subs SET status = 'skipped' WHERE id = $1`, [id]);
        continue;
      }
      await pool.query(`UPDATE event_reminder_subs SET status = 'sent', sent_at = now() WHERE id = $1`, [id]);
      try {
        await pushOne(t.confirm, r.openid, r, 'confirm');
        confirmSent = true;
      } catch (e) {
        await pool.query(`UPDATE event_reminder_subs SET status = 'failed', error = $2 WHERE id = $1`, [id, (e instanceof Error ? e.message : 'error').slice(0, 200)]);
      }
      continue;
    }
    await pool.query(
      `INSERT INTO event_reminder_subs (event_id, contact_id, kind, openid) VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, contact_id, kind) DO UPDATE
         SET openid = EXCLUDED.openid, accepted_at = now(),
             status = CASE WHEN event_reminder_subs.status = 'failed' THEN 'pending' ELSE event_reminder_subs.status END`,
      [r.event_id, contactId, k, r.openid]
    );
  }
  return { saved: kinds, confirmSent };
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

function wxConfigured(): boolean {
  return !!(process.env.WX_APPID && process.env.WX_SECRET);
}

type EvInfo = { slug: string; title: string; starts_at: Date; timezone: string; location_name: string | null; address: string | null };

/** 推一条订阅消息；失败抛错（errcode）。 */
async function pushOne(tm: Tmpl, openid: string, ev: EvInfo, kind: SubKind): Promise<void> {
  const values: Record<string, string> = {
    title: cut(ev.title, 20),
    time: fmtTime(ev.starts_at, ev.timezone || 'America/Los_Angeles'),
    place: cut(ev.location_name || ev.address || '详见活动页', 20),
    note: NOTES[kind]
  };
  const data: Record<string, { value: string }> = {};
  for (const [k, key] of Object.entries(tm.fields)) if (key) data[key] = { value: values[k] };
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${await accessToken()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ touser: openid, template_id: tm.id, page: `pages/event/event?slug=${encodeURIComponent(ev.slug)}`, data, miniprogram_state: 'formal', lang: 'zh_CN' })
  });
  const j = (await res.json()) as { errcode?: number };
  if (j.errcode) throw new Error(`errcode ${j.errcode}`);
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
  const configured = wxConfigured() && !!(t.day_before || t.two_hours);
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
    try {
      await pushOne(tm, d.openid, d, d.kind);
      sent++;
    } catch (e) {
      failed++;
      await pool.query(`UPDATE event_reminder_subs SET status = 'failed', error = $2 WHERE id = $1`, [d.id, (e instanceof Error ? e.message : 'error').slice(0, 200)]);
    }
  }
  return { sent, failed, skipped: skipped ?? 0, configured };
}
