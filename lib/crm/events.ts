/**
 * 报名、签到、入场判断、订单（数据库层）
 * ------------------------------------------------------------------
 * 题库 V1.1 表 7-2 / 7-3 / 7-4，方案 V3.1 第 04–06 节。
 * 关键原则：已报名 ≠ 已付款；到了门口 ≠ 有入场资格；重复扫码只产生一次结果。
 */
import { randomBytes } from 'node:crypto';
import { pickRequired } from './engine';
import {
  loadProfile,
  openEventTask,
  recordAnswer,
  skippedInTask,
  type Db,
  type Task
} from './profile';
import type { AnswerValue, Question } from './questionBank';

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: Date;
  ends_at: Date | null;
  capacity: number | null;
  fee_cents: number;
  topic_tags: string[];
  registration_open: boolean;
  event_status: string;
};

export type Registration = {
  id: string;
  event_id: string;
  contact_id: string;
  status: 'registered' | 'waitlisted' | 'cancelled';
  arrival_status: 'none' | 'checked_in' | 'arrived_pending_payment';
};

// ── 身份 ───────────────────────────────────────────────────────────────

export function normalizePhone(raw: string, defaultCountry: '+1' | '+86' = '+1'): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return /^\+\d{8,15}$/.test(digits) ? digits : null;
  if (defaultCountry === '+1' && /^1?\d{10}$/.test(digits)) return `+1${digits.slice(-10)}`;
  if (defaultCountry === '+86' && /^1\d{10}$/.test(digits)) return `+86${digits}`;
  return null;
}

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/**
 * 已验证的手机号或邮箱 → 找到或建立档案（一人一档；不凭同名合并）。
 * 调用前必须已经通过验证码校验。
 */
export async function findOrCreateContact(
  db: Db,
  id: { phone?: string | null; email?: string | null; wechatOpenid?: string | null },
  name: string
): Promise<{ id: string; created: boolean }> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM contacts
      WHERE ($1::text IS NOT NULL AND phone_e164 = $1)
         OR ($2::text IS NOT NULL AND email = $2)
         OR ($3::text IS NOT NULL AND wechat_openid = $3)
      ORDER BY created_at LIMIT 1`,
    [id.phone ?? null, id.email ?? null, id.wechatOpenid ?? null]
  );
  if (rows[0]) {
    // 补全已验证的新联系方式（不覆盖已有的）
    await db.query(
      `UPDATE contacts SET
         phone_e164 = COALESCE(phone_e164, $2), phone_verified_at = COALESCE(phone_verified_at, CASE WHEN $2::text IS NOT NULL THEN now() END),
         email = COALESCE(email, $3), email_verified_at = COALESCE(email_verified_at, CASE WHEN $3::text IS NOT NULL THEN now() END),
         wechat_openid = COALESCE(wechat_openid, $4), updated_at = now()
       WHERE id = $1`,
      [rows[0].id, id.phone ?? null, id.email ?? null, id.wechatOpenid ?? null]
    );
    return { id: rows[0].id, created: false };
  }
  const { rows: ins } = await db.query<{ id: string }>(
    `INSERT INTO contacts (name, phone_e164, phone_verified_at, email, email_verified_at, wechat_openid)
     VALUES ($1, $2, CASE WHEN $2::text IS NOT NULL THEN now() END, $3, CASE WHEN $3::text IS NOT NULL THEN now() END, $4)
     RETURNING id`,
    [name, id.phone ?? null, id.email ?? null, id.wechatOpenid ?? null]
  );
  return { id: ins[0].id, created: true };
}

// ── 报名 ───────────────────────────────────────────────────────────────

export async function getEventBySlug(db: Db, slug: string): Promise<EventRow | null> {
  const { rows } = await db.query<EventRow>(`SELECT * FROM events WHERE slug = $1`, [slug]);
  return rows[0] ?? null;
}

async function activeCount(db: Db, eventId: string): Promise<number> {
  const { rows } = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM registrations WHERE event_id = $1 AND status = 'registered'`,
    [eventId]
  );
  return Number(rows[0].n);
}

export type RegisterOutcome = {
  registration: Registration;
  task: Task;
  /** 报名表里需要回答的必答题（首次报名为空，由 Q01–Q03 承担） */
  required: Question[];
  orderNo: string | null;
  alreadyRegistered: boolean;
};

/**
 * 报名：同一人同一场只有一条记录；重复提交、重复扫码都回到原记录。
 * 必答题在报名表里同一屏回答，答完才算报名成功（submitRegistration）。
 */
export async function startRegistration(
  db: Db,
  ev: EventRow,
  contactId: string,
  opts: { source?: 'online' | 'onsite' | 'staff'; refContactId?: string | null; channelCode?: string | null } = {}
): Promise<RegisterOutcome> {
  if (ev.event_status !== 'scheduled') throw new CrmError('event_closed', '活动已取消或已结束');
  const { rows: ex } = await db.query<Registration>(
    `SELECT * FROM registrations WHERE event_id = $1 AND contact_id = $2 FOR UPDATE`,
    [ev.id, contactId]
  );
  let reg = ex[0];
  const alreadyRegistered = !!reg && reg.status !== 'cancelled';
  if (!reg || reg.status === 'cancelled') {
    if (!ev.registration_open && opts.source !== 'staff') throw new CrmError('registration_closed', '本场报名已截止');
    // 现场来的人（扫签到码 / 工作人员登记）已经到了门口：不受名额限制，直接算已报名。
    const onsite = opts.source === 'onsite' || opts.source === 'staff';
    const full = !onsite && ev.capacity != null && (await activeCount(db, ev.id)) >= ev.capacity;
    const status = full ? 'waitlisted' : 'registered';
    const { rows } = await db.query<Registration>(
      reg
        ? `UPDATE registrations SET status = $3, cancelled_at = NULL, updated_at = now() WHERE event_id = $1 AND contact_id = $2 RETURNING *`
        : `INSERT INTO registrations (event_id, contact_id, status, source, ref_contact_id, channel_code)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      reg ? [ev.id, contactId, status] : [ev.id, contactId, status, opts.source ?? 'online', opts.refContactId ?? null, opts.channelCode ?? null]
    );
    reg = rows[0];
  }
  const task = await openEventTask(db, contactId, ev.id, ev.ends_at ?? ev.starts_at);
  const { view, answered, cooling } = await loadProfile(db, contactId);
  const isFirstTime = !answered.has('Q03');
  const required = isFirstTime
    ? []
    : pickRequired(
        view,
        { answered, cooling, skippedInTask: await skippedInTask(db, contactId, task.id) },
        ev.topic_tags,
        // 本场活动已答过的项目计入 3 道必答：中途退出再回来，只补剩下的
        Math.max(0, 3 - task.new_items_count)
      );
  const orderNo = ev.fee_cents > 0 && reg.status === 'registered' ? await ensureEventOrder(db, ev, contactId) : null;
  return { registration: reg, task, required, orderNo, alreadyRegistered };
}

/** 报名表提交：写入必答答案（同一任务，位置依次锁定）。 */
export async function submitAnswers(
  db: Db,
  contactId: string,
  task: Task,
  answers: { code: string; value: AnswerValue }[]
): Promise<{ pointsAwarded: number; needsMoreText: string[] }> {
  let pointsAwarded = 0;
  const needsMoreText: string[] = [];
  for (const a of answers) {
    const r = await recordAnswer(db, {
      contactId,
      task,
      itemCode: a.code,
      value: a.value,
      source: 'text' in a.value ? 'self_text' : 'self_select'
    });
    pointsAwarded += r.pointsAwarded;
    if (r.needsMoreText) needsMoreText.push(a.code);
  }
  return { pointsAwarded, needsMoreText };
}

export async function cancelRegistration(db: Db, eventId: string, contactId: string): Promise<void> {
  const { rows: cur } = await db.query<{ arrival_status: string }>(
    `SELECT arrival_status FROM registrations WHERE event_id = $1 AND contact_id = $2 AND status <> 'cancelled'`,
    [eventId, contactId]
  );
  if (cur[0] && cur[0].arrival_status !== 'none') throw new CrmError('already_checked_in', '您已签到，不能再取消报名');
  await db.query(
    `UPDATE registrations SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE event_id = $1 AND contact_id = $2 AND status <> 'cancelled' AND arrival_status = 'none'`,
    [eventId, contactId]
  );
  await db.query(
    `UPDATE orders SET status = 'cancelled', updated_at = now()
      WHERE contact_id = $1 AND related_id = $2 AND purpose = 'event_fee' AND status = 'pending_payment'`,
    [contactId, eventId]
  );
}

// ── 订单 ───────────────────────────────────────────────────────────────

function newOrderNo(): string {
  const d = new Date();
  const yymm = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return `S${yymm}-${randomBytes(3).toString('hex').toUpperCase().slice(0, 4)}`;
}

async function ensureEventOrder(db: Db, ev: EventRow, contactId: string): Promise<string> {
  const { rows } = await db.query<{ order_no: string }>(
    `SELECT order_no FROM orders WHERE contact_id = $1 AND related_id = $2 AND purpose = 'event_fee' AND status <> 'cancelled'`,
    [contactId, ev.id]
  );
  if (rows[0]) return rows[0].order_no;
  const { rows: ins } = await db.query<{ order_no: string }>(
    `INSERT INTO orders (order_no, contact_id, purpose, related_id, description, amount_cents)
     VALUES ($1, $2, 'event_fee', $3, $4, $5) RETURNING order_no`,
    [newOrderNo(), contactId, ev.id, ev.title, ev.fee_cents]
  );
  return ins[0].order_no;
}

/** 会员从银行 App 返回后提交付款说明 → 待核款（不等于已到账） */
export async function submitPaymentNote(db: Db, contactId: string, orderNo: string, note: string, payerName?: string) {
  await db.query(
    `UPDATE orders SET status = 'payment_submitted', payer_note = $3, payer_name = $4, submitted_at = now(), updated_at = now()
      WHERE order_no = $1 AND contact_id = $2 AND status = 'pending_payment'`,
    [orderNo, contactId, note, payerName ?? null]
  );
}

/** 授权人员核对银行实际到账后确认：统一走 lib/crm/orders.ts 的 markOrderPaid（重复点击不重复处理）。 */
export async function verifyPayment(orderNo: string, staff: string, bankReference?: string): Promise<boolean> {
  const { markOrderPaid } = await import('./orders');
  return (await markOrderPaid(orderNo, { staff, provider: 'zelle', reference: bankReference ?? null })).changed;
}

// ── 签到：表 7-4 入场判断（所有签到路径统一套用）──────────────────────────

export type CheckinResult =
  | { kind: 'checked_in'; message: string; first: boolean }
  | { kind: 'already'; message: string }
  | { kind: 'pending_payment'; message: string; orderNo: string; amountCents: number }
  | { kind: 'waitlisted'; message: string }
  | { kind: 'rejected'; message: string };

export const CHECKIN_POINTS = 20; // 方案 V3.1 第 08 节试点建议值，可在发布前调整

export async function checkIn(
  db: Db,
  ev: EventRow,
  contactId: string,
  method: 'self_scan' | 'staff' = 'self_scan'
): Promise<CheckinResult> {
  if (ev.event_status === 'cancelled') return { kind: 'rejected', message: '本场活动已取消' };
  if (ev.event_status === 'completed') return { kind: 'rejected', message: '本场活动已结束' };

  // 加锁顺序与报名一致：先档案、后报名，同一人连点签到时不会互相等待而死锁。
  await db.query(`SELECT 1 FROM contacts WHERE id = $1 FOR NO KEY UPDATE`, [contactId]);
  const { rows } = await db.query<Registration>(
    `SELECT * FROM registrations WHERE event_id = $1 AND contact_id = $2 FOR UPDATE`,
    [ev.id, contactId]
  );
  let reg = rows[0];
  if (!reg || reg.status === 'cancelled') {
    // 现场临时报名（场景 5 / 5b）：名额允许才登记
    const out = await startRegistration(db, ev, contactId, { source: 'onsite' });
    reg = out.registration;
  }
  if (reg.status === 'waitlisted') {
    // 候补的人到了现场：直接转为已报名再签到（满员也让进，现场按签到人数控制）。
    const { rows: up } = await db.query<Registration>(
      `UPDATE registrations SET status = 'registered', updated_at = now() WHERE id = $1 RETURNING *`,
      [reg.id]
    );
    reg = up[0];
  }
  if (reg.arrival_status === 'checked_in') return { kind: 'already', message: '您已签到，无需重复操作。里面请！' };

  if (ev.fee_cents > 0) {
    const { rows: o } = await db.query<{ order_no: string; status: string; amount_cents: number }>(
      `SELECT order_no, status, amount_cents FROM orders
        WHERE contact_id = $1 AND related_id = $2 AND purpose = 'event_fee' AND status <> 'cancelled'`,
      [contactId, ev.id]
    );
    const paid = o[0] && (o[0].status === 'paid');
    if (!paid) {
      await db.query(
        `UPDATE registrations SET arrival_status = 'arrived_pending_payment', arrived_at = COALESCE(arrived_at, now()), updated_at = now() WHERE id = $1`,
        [reg.id]
      );
      const orderNo = o[0]?.order_no ?? (await ensureEventOrder(db, ev, contactId));
      return {
        kind: 'pending_payment',
        message: o[0]?.status === 'payment_submitted' ? '付款说明已收到，正在核款，请稍候' : '报名信息已保存，请完成付款或等待核款',
        orderNo,
        amountCents: o[0]?.amount_cents ?? ev.fee_cents
      };
    }
  }

  await db.query(
    `UPDATE registrations SET arrival_status = 'checked_in', checked_in_at = now(), arrived_at = COALESCE(arrived_at, now()),
            checkin_method = $2, updated_at = now() WHERE id = $1`,
    [reg.id, method]
  );
  await db.query(
    `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, related_id)
     VALUES ($1, 'checkin', $2, $3, '参加活动签到', $4) ON CONFLICT (event_key) DO NOTHING`,
    [contactId, CHECKIN_POINTS, `checkin:${contactId}:${ev.id}`, ev.id]
  );
  return { kind: 'checked_in', message: '签到成功，欢迎光临！', first: true };
}

export class CrmError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
