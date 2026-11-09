/**
 * 1.3.1 B：报名人数与确认候补。
 *
 * 名额：每场两个数——当前上限（capacity）和硬上限（hard_capacity，场地坐得下的极限）。
 *  - 报到当前上限：工作人员收到提醒，工作台一键 +10 / +20 / 自定义（不超过硬上限）；后面报名的进候补。
 *  - 小程序不显示“已报 N 人”，只显示 名额充足 / 所剩不多 / 已满可候补。
 *
 * 活动前确认时间线（按活动所在地时区；每 5–15 分钟由 /api/cron/event-reminders 带着跑一次）：
 *  - 前 24 小时：问“明天的活动您来吗？”（微信订阅消息有授权就用，没有就短信）
 *  - 前 22 小时：没回的再问一次，加一句“1 小时内未确认将转候补”
 *  - 前 21 小时：还没回的转候补（排在原候补后面），空出的名额按顺序递补：“有名额了，请 4 小时内确认”
 *  - 递补 4 小时没确认 → 给下一位；开场前不足 4 小时，确认窗口缩短为 1 小时，开场后停止递补
 *  - 消息全部发不出去：进异常名单，不记爽约、不转候补
 *  - 已确认、已取消、已签到：停止后续催确认
 * 连续两次报了名、没确认也没来：下次报名自动进候补（后台可解除）。
 * 东哥在后台打开“确认时间线”（confirm_timeline_enabled）前，系统一条都不发、一个人都不转。
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { getSetting } from '@/lib/crm/orders';
import { withWxToken, wxConfigured } from '@/lib/crm/wechat';
import { subscribeTemplates } from '@/lib/crm/reminders';
import type { Staff } from '@/lib/crm/auth';
import { actor, audit } from '@/lib/crm/staff';

type Db = { query: ReturnType<typeof getPool>['query'] };

export const ASK_H = 24;
export const REMIND_H = 22;
export const RELEASE_H = 21;
export const OFFER_H = 4;
export const SHORT_OFFER_H = 1;

export type SeatKey = 'plenty' | 'few' | 'full' | 'open';
export const SEAT_LABEL: Record<SeatKey, string> = { plenty: '名额充足', few: '所剩不多', full: '已满可候补', open: '名额充足' };

/** 名额状态（只给标签，不给数字）。所剩不多：剩下不到 20% 或不到 5 个。 */
export function seatStatus(capacity: number | null, taken: number): { key: SeatKey; label: string } {
  if (capacity == null) return { key: 'open', label: SEAT_LABEL.open };
  const left = capacity - taken;
  const key: SeatKey = left <= 0 ? 'full' : left <= Math.max(5, Math.ceil(capacity * 0.2)) ? 'few' : 'plenty';
  return { key, label: SEAT_LABEL[key] };
}

/** 占座的人：已报名 + 递补邀请还在确认期限内的 */
export async function takenSeats(db: Db, eventId: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM registrations WHERE event_id = $1 AND (status = 'registered' OR (status = 'waitlisted' AND confirm_status = 'offered' AND offer_expires_at > now()))`,
    [eventId]
  );
  return rows[0].n;
}

export async function waitlistPosition(db: Db, eventId: string, contactId: string): Promise<number | null> {
  const { rows } = await db.query<{ pos: number }>(
    `SELECT pos FROM (SELECT contact_id, row_number() OVER (ORDER BY coalesce(waitlisted_at, created_at), created_at)::int AS pos
                        FROM registrations WHERE event_id = $1 AND status = 'waitlisted') x WHERE contact_id = $2`,
    [eventId, contactId]
  );
  return rows[0]?.pos ?? null;
}

/** 连续两次报了名、没确认也没来（消息发不出去的那次不算）。 */
export async function isRepeatNoShow(db: Db, contactId: string): Promise<boolean> {
  const { rows } = await db.query<{ miss: boolean }>(
    `SELECT (r.arrival_status = 'none' AND r.confirm_status <> 'confirmed' AND NOT r.unreachable) AS miss
       FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.contact_id = $1 AND r.status = 'registered' AND e.event_status <> 'cancelled'
        AND coalesce(e.ends_at, e.starts_at + interval '3 hours') < now()
      ORDER BY e.starts_at DESC LIMIT 2`,
    [contactId]
  );
  const { rows: ex } = await db.query<{ noshow_exempt: boolean }>(`SELECT noshow_exempt FROM contacts WHERE id = $1`, [contactId]);
  return rows.length === 2 && rows.every((r) => r.miss) && !ex[0]?.noshow_exempt;
}

/**
 * 新报名之后（startRegistration 里调用）：
 *  - 连续两次爽约 → 进候补（不占正式名额）
 *  - 进候补的记排队时间
 *  - 活动前 24 小时内才报名 → 报名即确认出席
 *  - 报到当前上限 → 提醒工作人员一次
 */
export async function afterRegister(db: Db, ev: { id: string; starts_at: Date; capacity: number | null }, regId: string, source: string) {
  const { rows } = await db.query<{ status: string; contact_id: string }>(`SELECT status, contact_id FROM registrations WHERE id = $1`, [regId]);
  const r = rows[0];
  if (!r) return;
  if (r.status === 'registered' && source === 'online' && (await isRepeatNoShow(db, r.contact_id))) {
    await db.query(`UPDATE registrations SET status = 'waitlisted', noshow_waitlisted = true, waitlisted_at = now(), updated_at = now() WHERE id = $1`, [regId]);
    r.status = 'waitlisted';
  }
  if (r.status === 'waitlisted') await db.query(`UPDATE registrations SET waitlisted_at = coalesce(waitlisted_at, now()) WHERE id = $1`, [regId]);
  if (r.status === 'registered' && new Date(ev.starts_at).getTime() - Date.now() <= ASK_H * 3600_000) {
    await db.query(`UPDATE registrations SET confirm_status = 'confirmed', confirmed_at = now() WHERE id = $1 AND confirm_status = 'none'`, [regId]);
  }
  if (ev.capacity != null && (await takenSeats(db, ev.id)) >= ev.capacity) {
    const { rows: a } = await db.query(`UPDATE events SET cap_alert_at = now() WHERE id = $1 AND cap_alert_at IS NULL RETURNING id`, [ev.id]);
    if (a[0]) {
      const { upsertFollowup } = await import('@/lib/crm/followups');
      const { rows: t } = await db.query<{ title: string }>(`SELECT title FROM events WHERE id = $1`, [ev.id]);
      await upsertFollowup(db as never, {
        source: 'manual',
        dedupeKey: `cap_full:${ev.id}:${ev.capacity}`,
        eventId: ev.id,
        name: t[0]?.title ?? '活动',
        need: `报名已到当前上限 ${ev.capacity} 人。可在工作台一键 +10 / +20 / 自定义（不超过硬上限）；后面报名的人进候补。`
      });
    }
  }
}

// ── 工作人员：加名额 / 放人 / 解除爽约 ────────────────────────────────────

export async function raiseCapacity(s: Staff, eventId: string, b: { add?: number; set?: number }) {
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; capacity: number | null; hard_capacity: number | null; slug: string }>(
      `SELECT id, capacity, hard_capacity, slug FROM events WHERE id = $1 FOR UPDATE`,
      [eventId]
    );
    const ev = rows[0];
    if (!ev) throw new CrmError('not_found', '找不到这场活动');
    const cur = ev.capacity ?? 0;
    let next = b.set != null ? Math.floor(Number(b.set)) : cur + Math.floor(Number(b.add ?? 0));
    if (!Number.isFinite(next) || next <= 0) throw new CrmError('bad_request', '人数不对');
    if (ev.hard_capacity != null && next > ev.hard_capacity) {
      if (cur >= ev.hard_capacity) throw new CrmError('hard_cap', `已到硬上限 ${ev.hard_capacity} 人（场地坐得下的极限），只能候补`);
      next = ev.hard_capacity;
    }
    await db.query(`UPDATE events SET capacity = $2, cap_alert_at = CASE WHEN $2 > coalesce(capacity, 0) THEN NULL ELSE cap_alert_at END, updated_at = now() WHERE id = $1`, [eventId, next]);
    await audit(db, s, 'capacity_change', 'event', eventId, { before: { capacity: ev.capacity }, after: { capacity: next } });
    return { capacity: next, hardCapacity: ev.hard_capacity, offers: await fillSeats(db, eventId) };
  });
}

/** 现场工作人员手动放人：候补直接转正式报名（不受当前上限限制，留操作记录） */
export async function staffAdmit(s: Staff, eventId: string, contactId: string) {
  return withTransaction(async (db) => {
    const { rows } = await db.query(
      `UPDATE registrations SET status = 'registered', confirm_status = 'confirmed', confirmed_at = now(), offer_expires_at = NULL, updated_at = now()
        WHERE event_id = $1 AND contact_id = $2 AND status = 'waitlisted' RETURNING id`,
      [eventId, contactId]
    );
    if (!rows[0]) throw new CrmError('not_found', '这个人不在候补名单里');
    await audit(db, s, 'staff_admit', 'contact', contactId, { after: { event: eventId } });
    return { ok: true };
  });
}

export async function setNoshowExempt(s: Staff, contactId: string, exempt: boolean) {
  await getPool().query(`UPDATE contacts SET noshow_exempt = $2, updated_at = now() WHERE id = $1`, [contactId, exempt]);
  await audit(getPool() as never, s, 'noshow_exempt', 'contact', contactId, { after: { exempt } });
  return { ok: true };
}

/** 工作台三组数：已确认 / 未确认 / 候补（+ 消息发不出去的异常名单） */
export async function confirmBoard(eventId: string) {
  const { rows } = await getPool().query<{ grp: string; n: number }>(
    `SELECT CASE WHEN status = 'waitlisted' THEN 'waitlist'
                 WHEN confirm_status = 'confirmed' OR arrival_status = 'checked_in' THEN 'confirmed'
                 ELSE 'unconfirmed' END AS grp, count(*)::int AS n
       FROM registrations WHERE event_id = $1 AND status <> 'cancelled' GROUP BY 1`,
    [eventId]
  );
  const by = Object.fromEntries(rows.map((r) => [r.grp, r.n]));
  const { rows: un } = await getPool().query<{ n: number }>(`SELECT count(*)::int AS n FROM registrations WHERE event_id = $1 AND unreachable AND status <> 'cancelled'`, [eventId]);
  const { rows: ev } = await getPool().query<{ capacity: number | null; hard_capacity: number | null }>(`SELECT capacity, hard_capacity FROM events WHERE id = $1`, [eventId]);
  return { confirmed: by.confirmed ?? 0, unconfirmed: by.unconfirmed ?? 0, waitlist: by.waitlist ?? 0, unreachable: un[0].n, capacity: ev[0]?.capacity ?? null, hardCapacity: ev[0]?.hard_capacity ?? null };
}

// ── 客户：一键确认 / 去不了（点开确认页再点一下，不在打开链接时自动确认） ───────────

function secret(): string {
  const s = process.env.PAY_LINK_SECRET || process.env.CRON_SECRET || process.env.AGENT_IP_SALT || (process.env.NODE_ENV !== 'production' ? 'dev-local-only' : '');
  if (!s) throw new Error('CRON_SECRET 未配置');
  return s;
}
export const confirmToken = (regId: string) => createHmac('sha256', secret()).update(`confirm:${regId}`).digest('base64url').slice(0, 24);
export function confirmTokenOk(regId: string, t: string | null | undefined): boolean {
  if (!t) return false;
  const a = Buffer.from(confirmToken(regId));
  const b = Buffer.from(String(t));
  return a.length === b.length && timingSafeEqual(a, b);
}
const siteBase = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
export const confirmLink = (regId: string) => `${siteBase()}/zh/confirm/${regId}?t=${confirmToken(regId)}`;

export async function confirmInfo(regId: string) {
  const { rows } = await getPool().query<{ id: string; status: string; confirm_status: string; arrival_status: string; offer_expires_at: Date | null; slug: string; title: string; starts_at: Date; timezone: string; location_name: string | null; event_status: string; name: string }>(
    `SELECT r.id, r.status, r.confirm_status, r.arrival_status, r.offer_expires_at, e.slug, e.title, e.starts_at, e.timezone, e.location_name, e.event_status, NULLIF(c.name, '微信用户') AS name
       FROM registrations r JOIN events e ON e.id = r.event_id JOIN contacts c ON c.id = r.contact_id WHERE r.id = $1`,
    [regId]
  );
  const r = rows[0];
  if (!r) throw new CrmError('not_found', '找不到这份报名');
  const state =
    r.event_status !== 'scheduled' ? 'closed'
    : r.status === 'cancelled' ? 'cancelled'
    : r.arrival_status === 'checked_in' ? 'checked_in'
    : r.status === 'waitlisted' && r.confirm_status === 'offered' && r.offer_expires_at && r.offer_expires_at > new Date() ? 'offer'
    : r.status === 'waitlisted' ? 'waitlist'
    : r.confirm_status === 'confirmed' ? 'confirmed'
    : 'ask';
  return { regId: r.id, state, title: r.title, startsAt: r.starts_at, timezone: r.timezone, place: r.location_name, offerExpiresAt: r.offer_expires_at, name: r.name };
}

/** 来 / 去不了。递补邀请确认后转正式报名；去不了 = 取消报名并把座位让给候补。 */
export async function answerConfirm(regId: string, yes: boolean) {
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; event_id: string; contact_id: string; status: string; confirm_status: string; offer_expires_at: Date | null; arrival_status: string }>(
      `SELECT id, event_id, contact_id, status, confirm_status, offer_expires_at, arrival_status FROM registrations WHERE id = $1 FOR UPDATE`,
      [regId]
    );
    const r = rows[0];
    if (!r) throw new CrmError('not_found', '找不到这份报名');
    if (r.status === 'cancelled') return { state: 'cancelled', message: '这份报名已经取消了' };
    if (r.arrival_status === 'checked_in') return { state: 'checked_in', message: '您已签到，祝您愉快' };
    if (!yes) {
      await db.query(`UPDATE registrations SET status = 'cancelled', cancelled_at = now(), confirm_status = 'declined', offer_expires_at = NULL, updated_at = now() WHERE id = $1`, [regId]);
      await fillSeats(db, r.event_id);
      return { state: 'cancelled', message: '已为您取消报名，感谢告知。下次活动见！' };
    }
    if (r.status === 'waitlisted') {
      if (r.confirm_status !== 'offered' || !r.offer_expires_at || r.offer_expires_at <= new Date()) {
        return { state: 'waitlist', message: '确认期限已过，名额已让给下一位。您还在候补名单里，有空位会再通知您。' };
      }
      await db.query(`UPDATE registrations SET status = 'registered', confirm_status = 'confirmed', confirmed_at = now(), offer_expires_at = NULL, updated_at = now() WHERE id = $1`, [regId]);
      return { state: 'confirmed', message: '名额已为您保留，到时见！' };
    }
    await db.query(`UPDATE registrations SET confirm_status = 'confirmed', confirmed_at = now(), updated_at = now() WHERE id = $1`, [regId]);
    return { state: 'confirmed', message: '已确认出席，到时见！' };
  });
}

// ── 递补 ───────────────────────────────────────────────────────────────

/** 空出的名额按候补顺序发递补邀请（同一座位不同时发给多人；刚被转候补的人 1 小时内不拿回自己刚释放的名额）。 */
export async function fillSeats(db: Db, eventId: string, now = new Date(), force = false): Promise<number> {
  // 时间线没打开：不自动递补（和 1.3 一样，现场工作人员手动放人），也不发任何消息
  if (!force && !(await timelineEnabled())) return 0;
  const { rows: ev } = await db.query<{ capacity: number | null; starts_at: Date; event_status: string }>(`SELECT capacity, starts_at, event_status FROM events WHERE id = $1`, [eventId]);
  const e = ev[0];
  if (!e || e.capacity == null || e.event_status !== 'scheduled') return 0;
  const startMs = new Date(e.starts_at).getTime();
  if (now.getTime() >= startMs) return 0; // 开场后停止递补
  const free = e.capacity - (await takenSeats(db, eventId));
  if (free <= 0) return 0;
  const hoursLeft = (startMs - now.getTime()) / 3600_000;
  const windowH = hoursLeft < OFFER_H ? SHORT_OFFER_H : OFFER_H;
  const expires = new Date(Math.min(now.getTime() + windowH * 3600_000, startMs));
  const { rows: next } = await db.query<{ id: string }>(
    `SELECT id FROM registrations
      WHERE event_id = $1 AND status = 'waitlisted'
        AND confirm_status NOT IN ('offered')
        AND NOT (confirm_status = 'released' AND released_at > $3::timestamptz - interval '1 hour')
        AND NOT (confirm_status = 'offer_expired')
      ORDER BY coalesce(waitlisted_at, created_at), created_at LIMIT $2 FOR UPDATE SKIP LOCKED`,
    [eventId, free, now]
  );
  for (const r of next) {
    await db.query(`UPDATE registrations SET confirm_status = 'offered', offer_expires_at = $2, updated_at = now() WHERE id = $1`, [r.id, expires]);
    await notify(db, r.id, 'offer');
  }
  return next.length;
}

// ── 发消息（微信订阅消息有授权先用；没有就短信；全失败进异常名单，不记爽约） ─────────

type Kind = 'ask' | 'remind' | 'released' | 'offer';
const TEXT: Record<Kind, (t: string, when: string) => string> = {
  ask: (t, w) => `明天的活动您来吗？「${t}」${w}。请点链接确认，未确认的名额会让给候补：`,
  remind: (t, w) => `「${t}」${w}，您还没确认是否出席。1 小时内未确认将转候补，请点链接确认：`,
  released: (t) => `「${t}」您没有确认出席，名额已让给候补，您已转入候补名单，有空位会通知您。`,
  offer: (t, w) => `有名额了！「${t}」${w}。请在 4 小时内点链接确认，逾期名额会给下一位：`
};
const NOTE: Record<Kind, string> = { ask: '明天的活动您来吗？点开确认', remind: '1 小时内未确认将转候补', released: '已转候补，有空位会通知您', offer: '有名额了，请尽快确认' };

function fmtWhen(d: Date, tz: string) {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: tz || 'America/Los_Angeles', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));
}

async function notify(db: Db, regId: string, kind: Kind): Promise<boolean> {
  const { rows } = await db.query<{ id: string; event_id: string; contact_id: string; slug: string; title: string; starts_at: Date; timezone: string; location_name: string | null; phone: string | null }>(
    `SELECT r.id, r.event_id, r.contact_id, e.slug, e.title, e.starts_at, e.timezone, e.location_name,
            COALESCE(c.phone_e164, (SELECT value FROM contact_methods m WHERE m.contact_id = c.id AND m.kind = 'phone' AND m.is_current)) AS phone
       FROM registrations r JOIN events e ON e.id = r.event_id JOIN contacts c ON c.id = r.contact_id WHERE r.id = $1`,
    [regId]
  );
  const r = rows[0];
  if (!r) return false;
  const log = async (channel: string, ok: boolean, error?: string) => {
    await db.query(
      `INSERT INTO confirm_sends (registration_id, kind, channel, ok, error) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (registration_id, kind, channel) DO UPDATE SET ok = EXCLUDED.ok, error = EXCLUDED.error, created_at = now()`,
      [regId, kind, channel, ok, error ?? null]
    );
  };
  // 1) 微信订阅消息：一次授权只能发一条，用这场活动还没用掉的授权
  const t = subscribeTemplates();
  const { rows: sub } = await db.query<{ id: string; kind: string; openid: string }>(
    `SELECT id, kind, openid FROM event_reminder_subs WHERE event_id = $1 AND contact_id = $2 AND status = 'pending' AND kind IN ('day_before','confirm','two_hours') ORDER BY (kind = 'day_before') DESC LIMIT 1`,
    [r.event_id, r.contact_id]
  );
  const tm = sub[0] ? (t[sub[0].kind as 'day_before'] ?? t.day_before) : undefined;
  if (sub[0] && tm && wxConfigured()) {
    try {
      const values: Record<string, string> = { title: r.title.slice(0, 20), time: fmtWhen(r.starts_at, r.timezone), place: (r.location_name || '详见活动页').slice(0, 20), note: NOTE[kind] };
      const data: Record<string, { value: string }> = {};
      for (const [k, key] of Object.entries(tm.fields)) if (key) data[key] = { value: values[k] };
      const j = await withWxToken(async (token) => {
        const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ touser: sub[0].openid, template_id: tm.id, page: `pages/confirm/confirm?reg=${r.id}`, data, miniprogram_state: 'formal', lang: 'zh_CN' })
        });
        return (await res.json()) as { errcode?: number };
      }, (x) => x.errcode);
      if (j.errcode) throw new Error(String(j.errcode));
      await db.query(`UPDATE event_reminder_subs SET status = 'sent', sent_at = now() WHERE id = $1`, [sub[0].id]);
      await log('wx', true);
      return true;
    } catch (e) {
      await log('wx', false, e instanceof Error ? e.message.slice(0, 40) : 'error');
    }
  }
  // 2) 短信兜底
  if (r.phone) {
    const { smsSend } = await import('@/lib/crm/payLinks');
    const body = TEXT[kind](r.title, fmtWhen(r.starts_at, r.timezone)) + (kind === 'released' ? '' : ` ${confirmLink(r.id)}`) + ' 【SAREC】';
    const ok = await smsSend(r.phone, body).catch(() => false);
    await log('sms', ok, ok ? undefined : 'sms_failed');
    if (ok) return true;
  }
  if (!r.phone && !sub[0]) await log('none', false, 'no_channel');
  return false;
}

// ── 定时：每 5–15 分钟跑一次 ──────────────────────────────────────────────

export async function timelineEnabled(): Promise<boolean> {
  return !!(await getSetting<boolean>(getPool(), 'confirm_timeline_enabled', false));
}

export async function runConfirmTimeline(now = new Date(), opts: { force?: boolean } = {}) {
  const out = { asked: 0, reminded: 0, released: 0, offers: 0, expired: 0, unreachable: 0, enabled: true };
  if (!opts.force && !(await timelineEnabled())) return { ...out, enabled: false };
  const pool = getPool();
  const { rows: evs } = await pool.query<{ id: string; starts_at: Date }>(
    `SELECT id, starts_at FROM events WHERE event_status = 'scheduled' AND starts_at > $1::timestamptz - interval '1 hour' AND starts_at <= $1::timestamptz + interval '${ASK_H} hours 30 minutes'`,
    [now]
  );
  for (const ev of evs) {
    const h = (new Date(ev.starts_at).getTime() - now.getTime()) / 3600_000;
    await withTransaction(async (db) => {
      // 递补过期 → 给下一位
      const { rows: exp } = await db.query(
        `UPDATE registrations SET confirm_status = 'offer_expired', offer_expires_at = NULL, updated_at = now()
          WHERE event_id = $1 AND status = 'waitlisted' AND confirm_status = 'offered' AND offer_expires_at <= $2 RETURNING id`,
        [ev.id, now]
      );
      out.expired += exp.length;
      // 前 24 小时：问
      if (h <= ASK_H && h > RELEASE_H) {
        const { rows } = await db.query<{ id: string }>(
          `SELECT id FROM registrations WHERE event_id = $1 AND status = 'registered' AND confirm_status = 'none' AND arrival_status = 'none' FOR UPDATE SKIP LOCKED`,
          [ev.id]
        );
        for (const r of rows) {
          const ok = await notify(db, r.id, 'ask');
          await db.query(`UPDATE registrations SET confirm_status = 'asked', asked_at = $2, unreachable = $3 WHERE id = $1`, [r.id, now, !ok]);
          if (ok) out.asked++;
          else {
            out.unreachable++;
            const { recordException } = await import('@/lib/crm/followups');
            await recordException('confirm_unreachable', `confirm_unreachable:${r.id}`, r.id, '确认出席消息全部发送失败（不记爽约、不转候补），请电话或微信联系');
          }
        }
      }
      // 前 22 小时：没回的再问
      if (h <= REMIND_H && h > RELEASE_H) {
        const { rows } = await db.query<{ id: string }>(
          `SELECT id FROM registrations WHERE event_id = $1 AND status = 'registered' AND confirm_status = 'asked' AND reminded_at IS NULL AND NOT unreachable AND arrival_status = 'none' FOR UPDATE SKIP LOCKED`,
          [ev.id]
        );
        for (const r of rows) {
          await notify(db, r.id, 'remind');
          await db.query(`UPDATE registrations SET reminded_at = $2 WHERE id = $1`, [r.id, now]);
          out.reminded++;
        }
      }
      // 前 21 小时：还没回的转候补（排到原候补后面）
      if (h <= RELEASE_H && h > 0) {
        const { rows } = await db.query<{ id: string }>(
          `UPDATE registrations SET status = 'waitlisted', confirm_status = 'released', released_at = $2, waitlisted_at = $2, updated_at = now()
            WHERE event_id = $1 AND status = 'registered' AND confirm_status = 'asked' AND NOT unreachable AND arrival_status = 'none' RETURNING id`,
          [ev.id, now]
        );
        for (const r of rows) await notify(db, r.id, 'released');
        out.released += rows.length;
      }
      out.offers += await fillSeats(db, ev.id, now, true);
    });
  }
  return out;
}

/** 管理员：时间线开关（打开前一条消息都不发） */
export async function setTimelineEnabled(s: Staff, on: boolean) {
  const { setSetting } = await import('@/lib/crm/orders');
  await setSetting(getPool() as never, 'confirm_timeline_enabled', on, actor(s));
  await audit(getPool() as never, s, 'confirm_timeline', 'setting', 'confirm_timeline_enabled', { after: { on } });
  return { on };
}
