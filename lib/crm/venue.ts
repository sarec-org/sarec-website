/**
 * 会议室、会场月卡、电子屏、商家优惠（会员端）
 * 会议室三步：看空闲时段 → 显示本人价格 → 付款（有当月有效月卡直接确认）。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from './events';
import { memberStatus } from './membership';
import { cancelOrder, getSetting, newOrderNo } from './orders';
import { activeTier, bookRoom, myRoomPrice } from './rooms';

export const ROOM_RULES_NOTICE =
  '会场月卡 $299/月：不限次数使用，先到先得，不影响商会正常会议安排。会议室使用拥挤时，商会有权调整规则，调整前通知持卡人并公布生效日期。地址：500 S Hacienda Blvd, City of Industry, CA 91745。';
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;
const TZ = 'America/Los_Angeles';

function laHour(d: Date): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(d);
  return Number(h);
}

export async function roomsOverview(contactId: string | null, fromIso: string, days: number) {
  const pool = getPool();
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) throw new CrmError('bad_request', '日期格式不对');
  const to = new Date(from.getTime() + Math.min(Math.max(days, 1), 31) * 864e5);
  const { rows: rooms } = await pool.query<{ id: number; name: string; hourly_cents: number }>(
    `SELECT id, name, hourly_cents FROM rooms WHERE is_active ORDER BY id`
  );
  const { rows: busy } = await pool.query<{ room_id: number; starts_at: Date; ends_at: Date; mine: boolean }>(
    `SELECT room_id, starts_at, ends_at, contact_id = $3 AS mine FROM room_bookings
      WHERE status <> 'cancelled' AND starts_at < $2 AND ends_at > $1 ORDER BY starts_at`,
    [from, to, contactId]
  );
  const passStd = Number(await getSetting(pool, 'room_pass_cents', 29900));
  const pass = await myRoomPrice(pool, contactId, passStd);
  const roomPrices = await Promise.all(rooms.map(async (r) => ({ ...r, my_hourly_cents: (await myRoomPrice(pool, contactId, r.hourly_cents)).cents })));
  const { rows: myPass } = contactId
    ? await pool.query<{ month_start: string; status: string }>(
        `SELECT month_start::text, status FROM room_passes WHERE contact_id = $1 AND month_start >= date_trunc('month', current_date)::date AND status <> 'cancelled' ORDER BY month_start`,
        [contactId]
      )
    : { rows: [] };
  return {
    rooms: roomPrices,
    busy,
    openHours: { from: OPEN_HOUR, to: CLOSE_HOUR, timezone: TZ },
    pass: { standardCents: passStd, myCents: pass.cents, pricesPublished: pass.published, mine: myPass },
    tier: pass.tier,
    notice: ROOM_RULES_NOTICE
  };
}

export async function bookRoomFor(contactId: string, roomId: number, startsAt: string, endsAt: string, purpose?: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) throw new CrmError('bad_request', '请选择开始和结束时间');
  if (s.getTime() < Date.now() - 5 * 60e3) throw new CrmError('bad_request', '不能预约已经过去的时间');
  const hours = (e.getTime() - s.getTime()) / 3600e3;
  if (hours > 8) throw new CrmError('bad_request', '单次最多预约 8 小时');
  if (s.getUTCMinutes() % 30 || e.getUTCMinutes() % 30) throw new CrmError('bad_request', '请按整点或半点预约');
  if (laHour(s) < OPEN_HOUR || laHour(new Date(e.getTime() - 1)) >= CLOSE_HOUR) throw new CrmError('bad_request', `开放时间为每天 ${OPEN_HOUR}:00–${CLOSE_HOUR}:00`);
  return withTransaction(async (db) => {
    const r = await bookRoom(db, { contactId, roomId, startsAt: s, endsAt: e, purpose, orderNo: newOrderNo });
    if (r.kind === 'taken') throw new CrmError('conflict', r.message);
    return r;
  });
}

export async function cancelBooking(contactId: string, bookingId: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; status: string; starts_at: Date; order_no: string | null; order_status: string | null }>(
    `SELECT b.id, b.status, b.starts_at, o.order_no, o.status AS order_status
       FROM room_bookings b LEFT JOIN orders o ON o.id = b.order_id WHERE b.id = $1 AND b.contact_id = $2`,
    [bookingId, contactId]
  );
  const b = rows[0];
  if (!b) throw new CrmError('not_found', '找不到这个预约');
  if (b.status === 'cancelled') return { message: '预约已取消' };
  if (b.order_no && (b.order_status === 'pending_payment' || b.order_status === 'payment_submitted')) {
    await cancelOrder(b.order_no, `self:${contactId}`, '会员自助取消预约');
  }
  await pool.query(`UPDATE room_bookings SET status = 'cancelled' WHERE id = $1`, [bookingId]);
  return {
    message: b.order_status === 'paid' ? '预约已取消。已付款项请联系工作人员改期或退款' : '预约已取消，时段已释放'
  };
}

export async function buyRoomPass(contactId: string, month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new CrmError('bad_request', '请选择月份');
  const monthStart = `${month}-01`;
  const now = new Date();
  const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  if (month < cur) throw new CrmError('bad_request', '不能购买已经过去的月份');
  return withTransaction(async (db) => {
    const { rows: ex } = await db.query<{ id: string; status: string; order_no: string | null }>(
      `SELECT p.id, p.status, o.order_no FROM room_passes p LEFT JOIN orders o ON o.id = p.order_id
        WHERE p.contact_id = $1 AND p.month_start = $2 AND p.status <> 'cancelled'`,
      [contactId, monthStart]
    );
    if (ex[0]) return { orderNo: ex[0].order_no, status: ex[0].status, existing: true };
    const std = Number(await getSetting(db, 'room_pass_cents', 29900));
    const price = await myRoomPrice(db, contactId, std);
    await db.query(`DELETE FROM room_passes WHERE contact_id = $1 AND month_start = $2 AND status = 'cancelled'`, [contactId, monthStart]);
    const { rows: p } = await db.query<{ id: string }>(
      `INSERT INTO room_passes (contact_id, month_start, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [contactId, monthStart]
    );
    const orderNo = newOrderNo();
    const { rows: o } = await db.query<{ id: string }>(
      `INSERT INTO orders (order_no, contact_id, purpose, related_id, description, amount_cents, gross_cents)
       VALUES ($1, $2, 'room_pass', $3, $4, $5, $6) RETURNING id`,
      [orderNo, contactId, p[0].id, `会场月卡 ${month}`, price.cents, std]
    );
    await db.query(`UPDATE room_passes SET order_id = $2 WHERE id = $1`, [p[0].id, o[0].id]);
    return { orderNo, status: 'pending', existing: false };
  });
}

// ── 电子屏 ──────────────────────────────────────────────────────────────
export async function screenInfo(contactId: string | null) {
  const pool = getPool();
  const tier = contactId ? await activeTier(pool, contactId) : null;
  const free = tier === 'vp' || tier === 'strategic_partner';
  const { rows: mine } = contactId
    ? await pool.query(
        `SELECT s.id, s.org_name, s.months, s.start_month::text, s.status, s.amount_cents, s.staff_note, s.created_at, o.order_no, o.status AS order_status
           FROM screen_ads s LEFT JOIN orders o ON o.id = s.order_id WHERE s.contact_id = $1 ORDER BY s.created_at DESC`,
        [contactId]
      )
    : { rows: [] };
  return { tier, free, pricesPublished: await getSetting<boolean>(pool, 'member_prices_published', false), mine };
}

export async function applyScreenAd(
  contactId: string,
  b: { orgName?: string; intro?: string; serviceArea?: string; qrUrl?: string; assetUrl?: string; months?: number }
) {
  const orgName = (b.orgName ?? '').trim();
  const intro = (b.intro ?? '').trim();
  if (!orgName || !intro) throw new CrmError('bad_request', '请填写单位名称和介绍');
  for (const u of [b.qrUrl, b.assetUrl]) {
    if (u && u.length > 1_500_000) throw new CrmError('bad_request', '图片太大，请换一张小于 1MB 的图片');
  }
  const months = Math.min(Math.max(Number(b.months) || 1, 1), 12);
  const pool = getPool();
  const tier = await activeTier(pool, contactId);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO screen_ads (contact_id, org_name, intro, service_area, qr_url, asset_url, months, tier_at_apply)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [contactId, orgName.slice(0, 120), intro.slice(0, 1000), (b.serviceArea ?? '').slice(0, 200) || null, b.qrUrl || null, b.assetUrl || null, months, tier]
  );
  return { id: rows[0].id, message: '申请已提交。工作人员审核排期后，会在“我的订单”里显示应付金额（副会长、战略伙伴单位免费）' };
}

export async function listOffers() {
  const { rows } = await getPool().query(
    `SELECT id, merchant, category, offer, conditions, contact, valid_until::text FROM merchant_offers
      WHERE is_active AND (valid_until IS NULL OR valid_until >= current_date) ORDER BY sort_order, merchant`
  );
  return rows;
}

export { memberStatus };
