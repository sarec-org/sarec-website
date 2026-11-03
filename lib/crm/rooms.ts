/**
 * 会议室预约与会场月卡（方案 V3.1 第 01 节“会员权益与场地服务”）
 * ------------------------------------------------------------------
 * - 先定先得：同一会议室同一时段只能有一个有效预约，由数据库排他约束保证。
 * - 月卡：标准价 299 美元/月，开放时段内不限小时、不限时段；会员按等级折扣。
 * - 会议室拥挤时商会有权调整规则：调整只改本文件常量与公告，不改历史预约。
 */
import type { Db } from './profile';

export const ROOM_PASS_STANDARD_CENTS = 29900;

/** 会议室及会场月卡按等级折扣（建议价，发布前结合场地成本确定） */
export const TIER_DISCOUNT: Record<string, number> = {
  member: 0.9,
  board: 0.85,
  exec_board: 0.8,
  vp: 0.7,
  strategic_partner: 0.6
};

/** 电子屏正常轮播月费（cents）；副会长、战略伙伴免费 */
export const SCREEN_AD_CENTS: Record<string, number> = {
  none: 5000,
  member: 4000,
  board: 3000,
  exec_board: 2000,
  vp: 0,
  strategic_partner: 0
};

/** 当前有效会员等级（无 = 注册用户） */
export async function activeTier(db: Db, contactId: string): Promise<string | null> {
  const { rows } = await db.query<{ slug: string }>(
    `SELECT COALESCE(t.slug, a.selected_tier_slug) AS slug
       FROM applications a LEFT JOIN membership_tiers t ON t.id = a.selected_tier_id
      WHERE a.contact_id = $1
        AND a.application_status IN ('paid','approved','second_payment_due')
        AND (a.membership_end_date IS NULL OR a.membership_end_date >= current_date)
      ORDER BY t.sort_order DESC NULLS LAST LIMIT 1`,
    [contactId]
  );
  return rows[0]?.slug ?? null;
}

export function priceFor(standardCents: number, tier: string | null): number {
  const d = tier ? TIER_DISCOUNT[tier] ?? 1 : 1;
  return Math.round(standardCents * d);
}

export type BookingResult =
  | { kind: 'confirmed'; bookingId: string; viaPass: true }
  | { kind: 'held'; bookingId: string; orderNo: string; amountCents: number }
  | { kind: 'taken'; message: string };

/** 有当月有效月卡 → 直接确认；否则生成订单，付款核对后确认。 */
export async function bookRoom(
  db: Db,
  args: { contactId: string; roomId: number; startsAt: Date; endsAt: Date; purpose?: string; orderNo: () => string }
): Promise<BookingResult> {
  const monthStart = new Date(Date.UTC(args.startsAt.getUTCFullYear(), args.startsAt.getUTCMonth(), 1));
  const { rows: pass } = await db.query<{ id: string }>(
    `SELECT id FROM room_passes WHERE contact_id = $1 AND month_start = $2 AND status = 'active'`,
    [args.contactId, monthStart]
  );
  try {
    await db.query('SAVEPOINT book');
    const { rows: b } = await db.query<{ id: string }>(
      `INSERT INTO room_bookings (room_id, contact_id, starts_at, ends_at, status, pass_id, purpose)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [args.roomId, args.contactId, args.startsAt, args.endsAt, pass[0] ? 'confirmed' : 'held', pass[0]?.id ?? null, args.purpose ?? null]
    );
    await db.query('RELEASE SAVEPOINT book');
    if (pass[0]) return { kind: 'confirmed', bookingId: b[0].id, viaPass: true };
    const { rows: room } = await db.query<{ hourly_cents: number }>(`SELECT hourly_cents FROM rooms WHERE id = $1`, [args.roomId]);
    const hours = (args.endsAt.getTime() - args.startsAt.getTime()) / 3600e3;
    const amount = priceFor(Math.round((room[0]?.hourly_cents ?? 0) * hours), await activeTier(db, args.contactId));
    const orderNo = args.orderNo();
    const { rows: o } = await db.query<{ id: string }>(
      `INSERT INTO orders (order_no, contact_id, purpose, related_id, description, amount_cents)
       VALUES ($1, $2, 'room_booking', $3, '会议室预约', $4) RETURNING id`,
      [orderNo, args.contactId, b[0].id, amount]
    );
    await db.query(`UPDATE room_bookings SET order_id = $2 WHERE id = $1`, [b[0].id, o[0].id]);
    return { kind: 'held', bookingId: b[0].id, orderNo, amountCents: amount };
  } catch (e: unknown) {
    await db.query('ROLLBACK TO SAVEPOINT book');
    if ((e as { code?: string }).code === '23P01') return { kind: 'taken', message: '这个时段刚被预约了，请换一个时段' };
    throw e;
  }
}
