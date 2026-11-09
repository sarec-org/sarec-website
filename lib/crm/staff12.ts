/**
 * SAREC 1.2 后台：线下预约登记（日历防撞期）与收款登记、会议室展示信息、1.2 配置项（商会微信二维码、视频号、专委会、内容显示范围）。
 */
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from './events';
import { getSetting, newOrderNo, setSetting } from './orders';
import { audit } from './staff';
import type { Staff } from './auth';

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

// ── 会议室展示信息（小程序只展示：照片、容纳人数、设备、地址、会员优惠说明，不写金额）──────────────
const MONEY_RE = /(\$|＄|美元|美金|元\/|USD|\d+\s*(元|块))/i;

export async function updateRoomInfo(s: Staff, b: { id?: number; capacity?: number | null; equipment?: string; intro?: string; photoUrls?: string[] }) {
  const id = Number(b.id);
  if (!id) throw new CrmError('bad_request', '请选择会议室');
  const equipment = str(b.equipment, 500);
  const intro = str(b.intro, 1000);
  if (MONEY_RE.test(equipment) || MONEY_RE.test(intro)) throw new CrmError('bad_request', '会议室介绍会显示在小程序里，请不要写价格或金额');
  const photos = Array.isArray(b.photoUrls) ? b.photoUrls.filter((u) => typeof u === 'string' && /^https:\/\//.test(u)).slice(0, 9) : undefined;
  return withTransaction(async (db) => {
    await db.query(
      `UPDATE rooms SET capacity = $2, equipment = NULLIF($3, ''), intro = NULLIF($4, ''), photo_urls = COALESCE($5, photo_urls) WHERE id = $1`,
      [id, b.capacity == null || b.capacity === ('' as unknown) ? null : Math.max(0, Math.round(Number(b.capacity))), equipment, intro, photos ?? null]
    );
    await audit(db, s, 'update_room_info', 'room', String(id), { after: { capacity: b.capacity, equipment, intro, photos: photos?.length } });
    return { id };
  });
}

/** 1.2 线上问题 P-3：会议室完整地址（后台“增长与设置”的 room_address 可改，比如补室号） */
export const ROOM_ADDRESS = '500 S Hacienda Blvd, City of Industry, CA 91745';
const OLD_ROOM_NOTICE = '会员按等级享受会议室优惠，具体请联系商会工作人员。';
/** 小程序里的会议室说明：不写价格（合规红线） */
export const ROOM_NOTICE_MP = '会场月卡：不限次数使用，先到先得，不影响商会正常会议安排。详情请联系商会。';

export async function roomsInfo() {
  const pool = getPool();
  const { rows } = await pool.query<{ id: number; name: string; capacity: number | null; equipment: string | null; intro: string | null; photo_urls: string[] }>(
    `SELECT id, name, capacity, equipment, intro, photo_urls FROM rooms WHERE is_active ORDER BY id`
  );
  const saved = await getSetting<string>(pool, 'room_notice', '');
  // 没改过（还是旧默认文字）就用新的月卡说明；工作人员改过的照用
  const notice = !saved || saved === OLD_ROOM_NOTICE ? ROOM_NOTICE_MP : saved;
  return { rooms: rows.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, equipment: r.equipment, intro: r.intro, photos: r.photo_urls ?? [] })), notice: MONEY_RE.test(notice) ? ROOM_NOTICE_MP : notice };
}

// ── 线下预约登记（工作人员电话 / 微信谈好后记一笔）────────────────────────────

export async function staffCreateBooking(
  s: Staff,
  b: {
    roomId?: number; contactId?: string; newName?: string; startsAt?: string; endsAt?: string; note?: string;
    payment?: { amountCents?: number; provider?: string; reference?: string } | null;
  }
) {
  const roomId = Number(b.roomId);
  const start = b.startsAt ? new Date(b.startsAt) : null;
  const end = b.endsAt ? new Date(b.endsAt) : null;
  if (!roomId) throw new CrmError('bad_request', '请选择会议室');
  if (!start || !end || isNaN(+start) || isNaN(+end) || end <= start) throw new CrmError('bad_request', '请填写正确的开始和结束时间');
  return withTransaction(async (db) => {
    let contactId = b.contactId && /^[0-9a-f-]{36}$/.test(b.contactId) ? b.contactId : null;
    if (!contactId) {
      const name = str(b.newName, 100);
      if (!name) throw new CrmError('bad_request', '请选择会员，或填写来访者姓名');
      // 只复用“之前线下代录、从没登录过”的同名档案（避免同一来访者重复建人）；
      // 不会自动挂到已登录的会员 / 访客名下——那种情况工作人员要在上面“选择会员”里明确选人
      const { rows: same } = await db.query<{ id: string }>(
        `SELECT id FROM contacts
          WHERE lower(btrim(name)) = lower(btrim($1)) AND acquisition_source = 'staff_room_booking'
            AND wechat_openid IS NULL AND email IS NULL AND phone_e164 IS NULL
          LIMIT 2`,
        [name]
      );
      if (same.length === 1) contactId = same[0].id;
      else {
        const { rows } = await db.query<{ id: string }>(`INSERT INTO contacts (name, acquisition_source) VALUES ($1, 'staff_room_booking') RETURNING id`, [name]);
        contactId = rows[0].id;
      }
    }
    let orderId: string | null = null;
    if (b.payment && Number(b.payment.amountCents) > 0) {
      const provider = ['zelle', 'cash', 'check', 'stripe', 'waived'].includes(String(b.payment.provider)) ? String(b.payment.provider) : 'zelle';
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO orders (order_no, contact_id, purpose, description, amount_cents, gross_cents, provider, status, paid_at, verified_by, bank_reference)
         VALUES ($1, $2, 'room_booking', '会议室（线下登记）', $3, $3, $4, 'paid', now(), $5, $6) RETURNING id`,
        [newOrderNo(), contactId, Math.round(Number(b.payment.amountCents)), provider, s.name, str(b.payment.reference, 100) || null]
      );
      orderId = rows[0].id;
    }
    try {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO room_bookings (room_id, contact_id, starts_at, ends_at, status, order_id, purpose, source, note, created_by)
         VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, 'staff', $7, $8) RETURNING id`,
        [roomId, contactId, start, end, orderId, str(b.note, 200) || null, str(b.note, 500) || null, s.name]
      );
      if (orderId) await db.query(`UPDATE orders SET related_id = $2 WHERE id = $1`, [orderId, rows[0].id]);
      await audit(db, s, 'staff_create_booking', 'contact', contactId, { after: { booking: rows[0].id, roomId, start, end, paid: !!orderId } });
      return { id: rows[0].id, contactId };
    } catch (e) {
      if ((e as { code?: string }).code === '23P01') throw new CrmError('conflict', '这个时段已经有预约了，请换一个时间');
      throw e;
    }
  });
}

/** 给已有预约登记收款（线下谈好、到账后记一笔） */
export async function staffRecordBookingPayment(s: Staff, bookingId: string, p: { amountCents?: number; provider?: string; reference?: string }) {
  const amount = Math.round(Number(p.amountCents));
  if (!(amount > 0)) throw new CrmError('bad_request', '请填写金额');
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ contact_id: string; order_id: string | null }>(`SELECT contact_id, order_id FROM room_bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    if (!rows[0]) throw new CrmError('not_found', '找不到这个预约');
    const provider = ['zelle', 'cash', 'check', 'stripe', 'waived'].includes(String(p.provider)) ? String(p.provider) : 'zelle';
    if (rows[0].order_id) {
      await db.query(
        `UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, now()), provider = $2, verified_by = $3, bank_reference = COALESCE($4, bank_reference), updated_at = now()
          WHERE id = $1 AND status <> 'paid'`,
        [rows[0].order_id, provider, s.name, str(p.reference, 100) || null]
      );
    } else {
      const { rows: o } = await db.query<{ id: string }>(
        `INSERT INTO orders (order_no, contact_id, purpose, related_id, description, amount_cents, gross_cents, provider, status, paid_at, verified_by, bank_reference)
         VALUES ($1, $2, 'room_booking', $3, '会议室（线下登记）', $4, $4, $5, 'paid', now(), $6, $7) RETURNING id`,
        [newOrderNo(), rows[0].contact_id, bookingId, amount, provider, s.name, str(p.reference, 100) || null]
      );
      await db.query(`UPDATE room_bookings SET order_id = $2, status = 'confirmed' WHERE id = $1`, [bookingId, o[0].id]);
    }
    await audit(db, s, 'record_booking_payment', 'contact', rows[0].contact_id, { after: { booking: bookingId, amount, provider } });
    return { ok: true };
  });
}

// ── 1.2 配置项（ops 可改）───────────────────────────────────────────────

export const GROWTH_KEYS = ['wechat_qr_url', 'channels_finder_id', 'committees', 'content_visibility', 'room_notice', 'room_address', 'photo_topic', 'companions_max', 'invite_prompts', 'oa_username', 'channels_live', 'wecom_userids', 'wecom_enabled', 'home_recap_days', 'invite_card_text'] as const;
export type GrowthKey = (typeof GROWTH_KEYS)[number];

export async function growthSettings() {
  const pool = getPool();
  const out: Record<string, unknown> = {};
  for (const k of GROWTH_KEYS) out[k] = await getSetting(pool, k, null);
  return out;
}

export async function updateGrowthSetting(s: Staff, key: string, value: unknown) {
  if (key === 'wecom_userids') await getPool().query(`DELETE FROM wecom_contact_ways`).catch(() => undefined);
  if (!(GROWTH_KEYS as readonly string[]).includes(key)) throw new CrmError('bad_request', '不能修改这个配置');
  if (key === 'wechat_qr_url' && !(value === '' || (typeof value === 'string' && /^https:\/\//.test(value)))) throw new CrmError('bad_request', '请上传二维码图片');
  if (key === 'channels_finder_id' && !(typeof value === 'string' && /^(|sph[A-Za-z0-9]{4,40})$/.test(value.trim()))) {
    throw new CrmError('bad_request', '视频号 ID 以 sph 开头（在视频号助手 → 账号设置里查看）；不填则小程序不显示视频号入口');
  }
  if (key === 'room_notice' && (typeof value !== 'string' || MONEY_RE.test(value))) throw new CrmError('bad_request', '会议室说明会显示在小程序里，请不要写价格或金额');
  if (key === 'room_address' && (typeof value !== 'string' || value.length > 200)) throw new CrmError('bad_request', '地址太长了');
  // 1.3 O：企业微信接待成员 userid（逗号分隔）；总开关（关掉 = 全部回到个人微信二维码）
  if (key === 'wecom_userids' && !(typeof value === 'string' && /^[A-Za-z0-9_.@,，\s-]{0,500}$/.test(value))) throw new CrmError('bad_request', '请填写企业微信成员的账号（userid），多个用逗号分开');
  if (key === 'wecom_enabled' && typeof value !== 'boolean') throw new CrmError('bad_request', '请选择开或关');
  // 1.3 P-4：活动结束后首页显示“上一场回顾”的天数；P-2：商会邀请卡文案（小程序里显示，不能写金额）
  if (key === 'home_recap_days' && !(Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 60)) throw new CrmError('bad_request', '请填 0–60 之间的整数');
  if (key === 'invite_card_text' && (typeof value !== 'object' || value === null || Array.isArray(value) || Object.values(value).some((v) => typeof v !== 'string' || v.length > 200 || MONEY_RE.test(v)))) {
    throw new CrmError('bad_request', '邀请卡文案每段不超过 200 字，不能写价格或金额');
  }
  if (key === 'committees') {
    if (!Array.isArray(value) || value.some((c) => !c || typeof c.name !== 'string' || !['active', 'preparing'].includes(c.status))) {
      throw new CrmError('bad_request', '格式不对');
    }
  }
  if (key === 'content_visibility' && (typeof value !== 'object' || value === null || Array.isArray(value))) throw new CrmError('bad_request', '格式不对');
  // 1.3
  if (key === 'photo_topic' && (typeof value !== 'string' || value.length > 30 || /[#\s]/.test(value.trim()))) throw new CrmError('bad_request', '贴图话题名不超过 30 个字，不要带 # 或空格；留空 = 不显示入口');
  if (key === 'companions_max' && !(Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 5)) throw new CrmError('bad_request', '每人最多带几位朋友：0–5');
  if (key === 'invite_prompts' && (typeof value !== 'object' || value === null || Array.isArray(value))) throw new CrmError('bad_request', '格式不对');
  if (key === 'oa_username' && !(typeof value === 'string' && /^(|gh_[a-f0-9]{12})$/.test(value.trim()))) throw new CrmError('bad_request', '服务号原始 ID 以 gh_ 开头（公众平台 → 设置 → 账号信息）；留空 = 不显示');
  if (key === 'channels_live' && (typeof value !== 'object' || value === null || Array.isArray(value))) throw new CrmError('bad_request', '格式不对');
  return withTransaction(async (db) => {
    const before = await getSetting(db, key, null);
    await setSetting(db, key, typeof value === 'string' ? value.trim() : value, s.name);
    await audit(db, s, 'update_setting', 'setting', key, { before, after: value });
    return { key };
  });
}

// ── 专委会与俱乐部意向 ───────────────────────────────────────────────────

export type Committee = { key: string; name: string; status: 'active' | 'preparing' };

export async function committees(contactId: string | null) {
  const pool = getPool();
  const list = await getSetting<Committee[]>(pool, 'committees', []);
  const mine = contactId
    ? new Set((await pool.query<{ committee: string }>(`SELECT committee FROM committee_interests WHERE contact_id = $1`, [contactId])).rows.map((r) => r.committee))
    : new Set<string>();
  return list.map((c) => ({ ...c, statusLabel: c.status === 'active' ? '已成立' : '筹备中', interested: mine.has(c.key) }));
}

export async function setCommitteeInterest(contactId: string, key: string, on: boolean) {
  const pool = getPool();
  const list = await getSetting<Committee[]>(pool, 'committees', []);
  if (!list.some((c) => c.key === key)) throw new CrmError('bad_request', '没有这个专委会');
  if (on) await pool.query(`INSERT INTO committee_interests (contact_id, committee) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [contactId, key]);
  else await pool.query(`DELETE FROM committee_interests WHERE contact_id = $1 AND committee = $2`, [contactId, key]);
  return committees(contactId);
}

export async function committeeInterestStats() {
  const { rows } = await getPool().query(
    `SELECT ci.committee, count(*)::int AS n, array_agg(c.name ORDER BY ci.created_at DESC) AS names
       FROM committee_interests ci JOIN contacts c ON c.id = ci.contact_id GROUP BY ci.committee`
  );
  return rows;
}
