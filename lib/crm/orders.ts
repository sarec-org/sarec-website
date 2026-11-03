/**
 * 统一订单：会费、活动费、会议室、会场月卡、电子屏共用同一套付款与核账。
 * ------------------------------------------------------------------
 * - 付款方式：Zelle（主，备注订单号，后台核款）或 Stripe 刷卡（webhook 验签后自动到账）。
 * - 到账后的业务动作只在 onOrderPaid() 一处，无论 Zelle 核款还是 Stripe 回调都走它。
 * - 会费例外（东哥 2026-11-03 拍板）：提交 Zelle 付款说明即生效为正式会员；
 *   工作人员事后核对到账，核实未到账才撤销。活动费等其他订单仍以核款为准。
 */
import { randomBytes } from 'node:crypto';
import type Stripe from 'stripe';
import { getPool, withTransaction } from '@/lib/db/client';
import { getStripe } from '@/lib/stripe/client';
import { CrmError } from './events';
import type { Db } from './profile';

export type OrderRow = {
  id: string;
  order_no: string;
  contact_id: string;
  purpose: 'membership' | 'event_fee' | 'lunch' | 'room_pass' | 'room_booking' | 'screen_ad' | 'other';
  related_id: string | null;
  description: string | null;
  amount_cents: number;
  gross_cents: number | null;
  points_redeemed: number;
  currency: string;
  provider: string;
  status: 'pending_payment' | 'payment_submitted' | 'paid' | 'cancelled' | 'refunded';
  payer_name: string | null;
  payer_note: string | null;
  submitted_at: Date | null;
  paid_at: Date | null;
  verified_by: string | null;
  stripe_session_id: string | null;
  application_payment_id: string | null;
  reject_reason: string | null;
  created_at: Date;
};

export const PURPOSE_LABEL: Record<OrderRow['purpose'], string> = {
  membership: '会费',
  event_fee: '活动费',
  lunch: '午餐',
  room_pass: '会场月卡',
  room_booking: '会议室预约',
  screen_ad: '电子屏展示',
  other: '其他'
};

export const STATUS_LABEL: Record<OrderRow['status'], string> = {
  pending_payment: '待付款',
  payment_submitted: '待核款',
  paid: '已付款',
  cancelled: '已取消',
  refunded: '已退款'
};

export function newOrderNo(): string {
  const d = new Date();
  const yymm = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return `S${yymm}-${randomBytes(3).toString('hex').toUpperCase().slice(0, 4)}`;
}

// ── 配置项 ──────────────────────────────────────────────────────────────
export async function getSetting<T>(db: Db, key: string, fallback: T): Promise<T> {
  try {
    const { rows } = await db.query<{ value: T }>(`SELECT value FROM crm_settings WHERE key = $1`, [key]);
    return rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(db: Db, key: string, value: unknown, by: string): Promise<void> {
  await db.query(
    `INSERT INTO crm_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [key, JSON.stringify(value), by]
  );
}

/** Zelle 收款信息：只读环境变量；缺失时页面显示“待配置”。 */
export function zelleInfo(): { name: string | null; id: string | null; qrUrl: string; configured: boolean } {
  const name = process.env.ZELLE_RECIPIENT_NAME?.trim() || null;
  const id = process.env.ZELLE_RECIPIENT_ID?.trim() || null;
  return { name, id, qrUrl: process.env.ZELLE_QR_URL?.trim() || '/crm/zelle-qr.png', configured: !!(name && id) };
}

export function stripeAvailable(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// ── 查询 ────────────────────────────────────────────────────────────────
export async function getOrder(db: Db, orderNo: string): Promise<OrderRow | null> {
  const { rows } = await db.query<OrderRow>(`SELECT * FROM orders WHERE order_no = $1`, [orderNo]);
  return rows[0] ?? null;
}

export async function getOwnOrder(db: Db, orderNo: string, contactId: string): Promise<OrderRow> {
  const o = await getOrder(db, orderNo);
  if (!o || o.contact_id !== contactId) throw new CrmError('not_found', '找不到这个订单，请检查订单号或重新登录');
  return o;
}

// ── 会员提交 Zelle 付款说明 ───────────────────────────────────────────────
export async function submitOrderNote(
  orderNo: string,
  contactId: string,
  note: string,
  payerName?: string | null
): Promise<OrderRow> {
  return withTransaction(async (db) => {
    const { rows } = await db.query<OrderRow>(
      `UPDATE orders SET status = 'payment_submitted', provider = 'zelle', payer_note = $3, payer_name = $4,
              submitted_at = now(), updated_at = now()
        WHERE order_no = $1 AND contact_id = $2 AND status = 'pending_payment' RETURNING *`,
      [orderNo, contactId, note.slice(0, 500), payerName?.slice(0, 100) ?? null]
    );
    const o = rows[0] ?? (await getOwnOrder(db, orderNo, contactId)); // 重复提交：原样返回
    if (rows[0] && o.purpose === 'membership' && o.related_id) {
      const { activateMembership } = await import('./membership');
      await activateMembership(db, o.related_id, 'zelle_submitted');
    }
    return o;
  });
}

// ── 到账（Zelle 核款 / Stripe 回调 / 免单）────────────────────────────────
export async function markOrderPaid(
  orderNo: string,
  by: { staff?: string; provider: 'zelle' | 'stripe' | 'cash' | 'check' | 'waived'; reference?: string | null; amountCents?: number }
): Promise<{ changed: boolean; order: OrderRow | null }> {
  return withTransaction(async (db) => {
    const { rows } = await db.query<OrderRow>(
      `UPDATE orders SET status = 'paid', paid_at = now(), provider = $2, verified_by = $3,
              bank_reference = COALESCE($4, bank_reference), updated_at = now()
        WHERE order_no = $1 AND status IN ('pending_payment','payment_submitted') RETURNING *`,
      [orderNo, by.provider, by.staff ?? (by.provider === 'stripe' ? 'stripe' : 'system'), by.reference ?? null]
    );
    if (!rows[0]) return { changed: false, order: await getOrder(db, orderNo) }; // 重复点击/重复回调不重复处理
    const o = rows[0];
    if (by.amountCents != null && by.amountCents !== o.amount_cents) {
      throw new CrmError('amount_mismatch', `到账金额与订单不符（订单 ${o.amount_cents / 100} 美元）`);
    }
    await db.query(
      `INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value, reason)
       VALUES ($1, 'verify_payment', 'order', $2, $3, $4)`,
      [by.staff ? `staff:${by.staff}` : `system:${by.provider}`, orderNo, JSON.stringify({ provider: by.provider }), by.reference ?? null]
    );
    await onOrderPaid(db, o, by.provider);
    return { changed: true, order: o };
  });
}

async function onOrderPaid(db: Db, o: OrderRow, provider: string): Promise<void> {
  switch (o.purpose) {
    case 'event_fee':
      if (o.related_id) {
        await db.query(
          `UPDATE registrations SET arrival_status = 'checked_in', checked_in_at = now(), checkin_method = 'staff', updated_at = now()
            WHERE event_id = $1 AND contact_id = $2 AND arrival_status = 'arrived_pending_payment'`,
          [o.related_id, o.contact_id]
        );
        // 到场待核款的人核款后补发签到积分（与 checkIn 同一个唯一键，不会重复）
        const { rows } = await db.query(
          `SELECT 1 FROM registrations WHERE event_id = $1 AND contact_id = $2 AND arrival_status = 'checked_in'`,
          [o.related_id, o.contact_id]
        );
        if (rows[0]) {
          const { CHECKIN_POINTS } = await import('./events');
          await db.query(
            `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, related_id)
             VALUES ($1, 'checkin', $2, $3, '参加活动签到', $4) ON CONFLICT (event_key) DO NOTHING`,
            [o.contact_id, CHECKIN_POINTS, `checkin:${o.contact_id}:${o.related_id}`, o.related_id]
          );
        }
      }
      break;
    case 'room_pass':
      if (o.related_id) await db.query(`UPDATE room_passes SET status = 'active' WHERE id = $1 AND status = 'pending'`, [o.related_id]);
      break;
    case 'room_booking':
      if (o.related_id) await db.query(`UPDATE room_bookings SET status = 'confirmed' WHERE id = $1 AND status = 'held'`, [o.related_id]);
      break;
    case 'screen_ad':
      if (o.related_id) await db.query(`UPDATE screen_ads SET updated_at = now() WHERE id = $1`, [o.related_id]);
      break;
    case 'membership':
      if (o.related_id) {
        const { membershipPaid } = await import('./membership');
        await membershipPaid(db, o, provider);
      }
      break;
  }
}

/** 核实未到账 / 会员取消：订单取消，积分抵扣冲回，相关占用释放；会费已生效的同时撤销。 */
export async function cancelOrder(orderNo: string, by: string, reason: string): Promise<boolean> {
  return withTransaction(async (db) => {
    const { rows } = await db.query<OrderRow>(
      `UPDATE orders SET status = 'cancelled', reject_reason = $2, updated_at = now()
        WHERE order_no = $1 AND status IN ('pending_payment','payment_submitted') RETURNING *`,
      [orderNo, reason]
    );
    if (!rows[0]) return false;
    const o = rows[0];
    await reverseRedemption(db, o, by);
    if (o.purpose === 'room_booking' && o.related_id) {
      await db.query(`UPDATE room_bookings SET status = 'cancelled' WHERE id = $1 AND status = 'held'`, [o.related_id]);
    }
    if (o.purpose === 'room_pass' && o.related_id) {
      await db.query(`UPDATE room_passes SET status = 'cancelled' WHERE id = $1 AND status = 'pending'`, [o.related_id]);
    }
    if (o.purpose === 'membership' && o.related_id) {
      await db.query(
        `UPDATE applications SET application_status = 'cancelled', payment_status = 'failed', updated_at = now()
          WHERE id = $1 AND payment_status <> 'paid'`,
        [o.related_id]
      );
      if (o.application_payment_id) {
        await db.query(`UPDATE payments SET payment_status = 'cancelled', updated_at = now() WHERE id = $1 AND payment_status = 'pending'`, [
          o.application_payment_id
        ]);
      }
    }
    await db.query(
      `INSERT INTO crm_audit_log (actor, action, target_type, target_id, reason) VALUES ($1, 'cancel_order', 'order', $2, $3)`,
      [by, orderNo, reason]
    );
    return true;
  });
}

// ── 积分抵扣（只用于续费会费，最多抵一半）──────────────────────────────
export async function redeemPoints(db: Db, contactId: string, orderId: string, points: number): Promise<void> {
  if (points <= 0) return;
  await db.query(
    `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, related_id)
     VALUES ($1, 'redeem', $2, $3, '积分抵扣续费会费', $4)`,
    [contactId, -points, `redeem:order:${orderId}`, orderId]
  );
}

async function reverseRedemption(db: Db, o: OrderRow, by: string): Promise<void> {
  if (!o.points_redeemed) return;
  const { rows } = await db.query<{ id: string }>(`SELECT id FROM points_ledger WHERE event_key = $1`, [`redeem:order:${o.id}`]);
  if (!rows[0]) return;
  await db.query(
    `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, related_id, reverses_id, created_by)
     VALUES ($1, 'redeem', $2, $3, '订单取消，抵扣积分退回', $4, $5, $6) ON CONFLICT (event_key) DO NOTHING`,
    [o.contact_id, o.points_redeemed, `redeem-reverse:order:${o.id}`, o.id, rows[0].id, by]
  );
}

// ── Stripe 刷卡（备用，供没有美国银行账户的会员）────────────────────────────
export async function createStripeSessionForOrder(o: OrderRow, base: string, email: string | null): Promise<string> {
  if (!stripeAvailable()) throw new CrmError('stripe_unavailable', '刷卡付款暂不可用，请用 Zelle 付款');
  if (o.status !== 'pending_payment') throw new CrmError('conflict', '这个订单已经提交过付款，请勿重复付款');
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: o.currency,
          unit_amount: o.amount_cents,
          product_data: { name: `SAREC ${PURPOSE_LABEL[o.purpose]} · ${o.description ?? ''} · ${o.order_no}`.slice(0, 250) }
        }
      }
    ],
    customer_email: email ?? undefined,
    client_reference_id: o.order_no,
    success_url: `${base}/zh/pay/${o.order_no}?stripe=success`,
    cancel_url: `${base}/zh/pay/${o.order_no}?stripe=cancel`,
    metadata: { orderNo: o.order_no, purpose: o.purpose }
  });
  await getPool().query(`UPDATE orders SET stripe_session_id = $2, updated_at = now() WHERE id = $1`, [o.id, session.id]);
  if (!session.url) throw new CrmError('stripe_failed', '刷卡页面没打开，请稍后再试或改用 Zelle');
  return session.url;
}

/** webhook：带 orderNo 的会话 → 统一订单到账。 */
export async function processOrderStripeSession(session: Stripe.Checkout.Session): Promise<string> {
  const orderNo = session.metadata?.orderNo;
  if (!orderNo) return 'no order';
  if (session.payment_status !== 'paid') return `not paid (${session.payment_status})`;
  if ((session.currency ?? '').toLowerCase() !== 'usd') return 'currency mismatch';
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
  const r = await markOrderPaid(orderNo, { provider: 'stripe', reference: pi, amountCents: session.amount_total ?? -1 });
  return r.changed ? 'paid' : 'already';
}

/** 支付成功页回跳时主动查一次 Stripe（webhook 迟到或未配置时也能及时到账）。 */
export async function syncStripeOrder(o: OrderRow): Promise<OrderRow> {
  if (!o.stripe_session_id || o.status !== 'pending_payment' || !stripeAvailable()) return o;
  const s = await getStripe().checkout.sessions.retrieve(o.stripe_session_id);
  if (s.payment_status === 'paid' && s.metadata?.orderNo === o.order_no) {
    await processOrderStripeSession(s);
    return (await getOrder(getPool(), o.order_no)) ?? o;
  }
  return o;
}
