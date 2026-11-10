/**
 * 工作人员后台服务（D.8）：活动管理、现场签到台、核款工作台、客户查询、积分调整、会议室与电子屏、配置、官网展示审核。
 * ------------------------------------------------------------------
 * - 所有签到都走 checkIn()（表 7-4 入场判断），核款走 markOrderPaid / cancelOrder（与 Stripe 同一套）。
 * - 关键操作写 crm_audit_log：谁、何时、对什么、依据。
 * - 权限在 API 层用 requireStaff 判断；本文件只做业务。
 */
import { REGION_TZ, isRegion } from '@/lib/crm/regions';
import { randomBytes, randomUUID } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import type { Staff } from './auth';
import { STATUS_TEXT, setMethod, type MethodStatus } from './contactInfo';
import { CrmError, checkIn, normalizeEmail, normalizePhone, startRegistration, submitAnswers, type EventRow } from './events';
import { cancelOrder, getSetting, markOrderPaid, newOrderNo, setSetting, PURPOSE_LABEL, STATUS_LABEL } from './orders';
import { loadProfile, type Db } from './profile';
import { QUESTION_BY_CODE, TOPIC_LABELS, findRoleSub } from './questionBank';
import { laToday } from '@/lib/laDate';
import { payLink } from './payLinks';

export const actor = (s: Staff) => `staff:${s.name}`;

export async function audit(
  db: Db,
  s: Staff | string,
  action: string,
  targetType: string,
  targetId: string,
  opts: { before?: unknown; after?: unknown; reason?: string | null } = {}
): Promise<void> {
  await db.query(
    `INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      typeof s === 'string' ? s : actor(s),
      action,
      targetType,
      targetId,
      opts.before === undefined ? null : JSON.stringify(opts.before),
      opts.after === undefined ? null : JSON.stringify(opts.after),
      opts.reason ?? null
    ]
  );
}

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// ── 活动 ────────────────────────────────────────────────────────────────
export type EventInput = {
  title?: string;
  checkinStartsAt?: string | null; // 签到开始时间（东哥 11/9 晚）；空 = 开始前 30 分钟
  slug?: string;
  summary?: string;
  startsAt?: string;
  endsAt?: string | null;
  timezone?: string;
  locationName?: string;
  address?: string;
  capacity?: number | null;
  hardCapacity?: number | null; // 1.3.1 B：硬上限（场地坐得下的极限）
  videoUrl?: string | null; // 1.3.1 G5：活动视频（YouTube / 视频号链接）
  feeCents?: number;
  region?: string; // 1.3.1 E：所在地区
  notifyScope?: 'local' | 'regions' | 'all'; // 通知范围：本地区 / 指定几个地区 / 全部地区（全部地区只有管理员能选）
  notifyRegions?: string[];
  topicTags?: string[];
  registrationOpen?: boolean;
  listed?: boolean;
  eventStatus?: string;
};

function slugify(title: string, startsAt: Date): string {
  const d = laToday(startsAt); // 洛杉矶日期
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${d}-${ascii || 'event'}-${randomBytes(2).toString('hex')}`;
}

/** 1.3.1 F：地区管理员只能建 / 管自己地区的活动 */
export function regionGuard(s: Staff, region: string) {
  if (s.roles.includes('admin') || !s.regions?.length) return;
  if (!s.regions.includes(region)) throw new CrmError('forbidden', `您只能管理 ${s.regions.join('、')} 的活动`);
}

function eventFields(b: EventInput, partial: boolean) {
  const out: Record<string, unknown> = {};
  if (!partial || b.title !== undefined) {
    const t = str(b.title, 200);
    if (!t) throw new CrmError('bad_request', '请填写活动标题');
    out.title = t;
  }
  if (!partial || b.startsAt !== undefined) {
    const s = new Date(String(b.startsAt));
    if (Number.isNaN(s.getTime())) throw new CrmError('bad_request', '请填写开始时间');
    out.starts_at = s;
  }
  if (b.endsAt !== undefined) {
    const e = b.endsAt ? new Date(b.endsAt) : null;
    if (e && Number.isNaN(e.getTime())) throw new CrmError('bad_request', '结束时间格式不对');
    out.ends_at = e;
  }
  if (b.checkinStartsAt !== undefined) {
    const c = b.checkinStartsAt ? new Date(b.checkinStartsAt) : null;
    if (c && Number.isNaN(c.getTime())) throw new CrmError('bad_request', '签到开始时间格式不对');
    out.checkin_starts_at = c;
  }
  if (b.summary !== undefined) out.summary = str(b.summary, 2000) || null;
  if (b.timezone !== undefined) out.timezone = str(b.timezone, 60) || 'America/Los_Angeles';
  if (b.locationName !== undefined) out.location_name = str(b.locationName, 200) || null;
  if (b.address !== undefined) out.address = str(b.address, 300) || null;
  const num = (v: unknown, label: string) => {
    if (v == null || v === ('' as unknown)) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new CrmError('bad_request', `${label}请填 0 或正整数`);
    return Math.floor(n);
  };
  if (b.capacity !== undefined) out.capacity = num(b.capacity, '当前上限');
  if (b.hardCapacity !== undefined) out.hard_capacity = num(b.hardCapacity, '硬上限');
  if (out.capacity != null && out.hard_capacity != null && Number(out.capacity) > Number(out.hard_capacity)) {
    throw new CrmError('bad_request', '当前上限不能超过硬上限（场地坐得下的极限）');
  }
  if (b.videoUrl !== undefined) {
    const v = str(b.videoUrl, 300);
    if (v && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be|channels\.weixin\.qq\.com|weixin\.qq\.com)\//i.test(v)) throw new CrmError('bad_request', '视频链接请填 YouTube 或视频号的链接');
    out.video_url = v || null;
  }
  if (b.region !== undefined) {
    if (!isRegion(b.region)) throw new CrmError('bad_request', '请选择活动所在地区');
    out.region = b.region;
    // 1.3.1 E（测试 P2-E4）：没单独指定时区时，按地区带出（纽约 → 纽约时间，中国大陆 → 北京时间）
    if (b.timezone === undefined && REGION_TZ[b.region]) out.timezone = REGION_TZ[b.region];
  }
  if (b.notifyScope !== undefined) {
    if (!['local', 'regions', 'all'].includes(String(b.notifyScope))) throw new CrmError('bad_request', '请选择通知范围');
    out.notify_scope = b.notifyScope;
  }
  if (b.notifyRegions !== undefined) out.notify_regions = (Array.isArray(b.notifyRegions) ? b.notifyRegions : []).filter(isRegion);
  if (b.feeCents !== undefined) out.fee_cents = Math.max(0, Math.round(Number(b.feeCents) || 0));
  if (b.topicTags !== undefined) out.topic_tags = (b.topicTags ?? []).filter((t) => t in TOPIC_LABELS);
  if (b.registrationOpen !== undefined) out.registration_open = !!b.registrationOpen;
  if (b.listed !== undefined) out.is_listed = !!b.listed;
  if (b.eventStatus !== undefined) {
    if (!['scheduled', 'completed', 'postponed', 'cancelled'].includes(String(b.eventStatus))) throw new CrmError('bad_request', '活动状态不对');
    out.event_status = b.eventStatus;
  }
  return out;
}

export async function listStaffEvents() {
  const { rows } = await getPool().query(
    `SELECT e.id, e.slug, e.title, e.starts_at, e.ends_at, e.location_name, e.capacity, e.fee_cents, e.topic_tags, e.region,
            e.registration_open, e.is_listed, e.event_status,
            count(r.*) FILTER (WHERE r.status = 'registered')::int AS registered,
            count(r.*) FILTER (WHERE r.status = 'waitlisted')::int AS waitlisted,
            count(r.*) FILTER (WHERE r.arrival_status = 'checked_in')::int AS checked_in,
            count(r.*) FILTER (WHERE r.arrival_status = 'arrived_pending_payment')::int AS arrived_pending
       FROM events e LEFT JOIN registrations r ON r.event_id = e.id
      GROUP BY e.id ORDER BY e.starts_at DESC LIMIT 200`
  );
  return rows;
}

export async function getStaffEvent(id: string) {
  const { rows } = await getPool().query(`SELECT * FROM events WHERE id = $1`, [id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  const { rows: regs } = await getPool().query(
    `SELECT r.status, r.arrival_status, r.source, r.checked_in_at, r.created_at, c.id AS contact_id, c.name, c.member_no::int,
            c.email, c.phone_e164, c.is_placeholder,
            (SELECT ab.name FROM contacts ab WHERE ab.id = r.added_by) AS added_by_name,
            (SELECT o.status FROM orders o WHERE o.contact_id = r.contact_id AND o.related_id = r.event_id AND o.purpose = 'event_fee' AND o.status <> 'cancelled' LIMIT 1) AS order_status,
            (SELECT o.order_no FROM orders o WHERE o.contact_id = r.contact_id AND o.related_id = r.event_id AND o.purpose = 'event_fee' AND o.status <> 'cancelled' LIMIT 1) AS order_no,
            -- 1.3 M：现场付 = 活动当天（洛杉矶时间）才确认到账的
            (SELECT CASE WHEN o.status <> 'paid' THEN NULL
                         WHEN (o.paid_at AT TIME ZONE 'America/Los_Angeles')::date = ((SELECT starts_at FROM events WHERE id = r.event_id) AT TIME ZONE 'America/Los_Angeles')::date THEN 'onsite'
                         ELSE 'before' END
               FROM orders o WHERE o.contact_id = r.contact_id AND o.related_id = r.event_id AND o.purpose = 'event_fee' AND o.status <> 'cancelled' LIMIT 1) AS paid_when
       FROM registrations r JOIN contacts c ON c.id = r.contact_id WHERE r.event_id = $1 ORDER BY r.created_at`,
    [id]
  );
  // 1.3 M：没付的给工作人员一条本人的付款链接（可复制发给本人）
  const withLink = regs.map((r) => ({ ...r, pay_link: r.order_no && r.order_status !== 'paid' ? safeLink(r.order_no) : null }));
  return { event: rows[0], registrations: withLink };
}

function safeLink(orderNo: string): string | null {
  try {
    return payLink(orderNo);
  } catch {
    return null;
  }
}

export async function createEvent(s: Staff, b: EventInput) {
  if (b.notifyScope === 'all' && !s.roles.includes('admin')) throw new CrmError('forbidden', '“全部地区”通知只有管理员能选');
  regionGuard(s, b.region ?? '洛杉矶/橙县');
  if (b.endsAt && b.startsAt && new Date(b.endsAt).getTime() <= new Date(b.startsAt).getTime()) throw new CrmError('bad_request', '结束时间要晚于开始时间');
  if (b.checkinStartsAt && b.startsAt && new Date(b.checkinStartsAt).getTime() > new Date(b.startsAt).getTime()) throw new CrmError('bad_request', '签到开始时间不能晚于活动开始时间');
  const f = eventFields(b, false);
  const slug = str(b.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, '') || slugify(f.title as string, f.starts_at as Date);
  return withTransaction(async (db) => {
    const cols = ['slug', ...Object.keys(f)];
    const vals = [slug, ...Object.values(f)];
    const { rows } = await db.query<{ id: string; slug: string }>(
      `INSERT INTO events (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id, slug`,
      vals
    ).catch((e: { code?: string }) => {
      if (e.code === '23505') throw new CrmError('conflict', '这个链接名已被占用，请换一个');
      throw e;
    });
    await audit(db, s, 'create_event', 'event', rows[0].id, { after: { ...f, slug } });
    return rows[0];
  });
}

export async function updateEvent(s: Staff, id: string, b: EventInput) {
  if (b.notifyScope === 'all' && !s.roles.includes('admin')) throw new CrmError('forbidden', '“全部地区”通知只有管理员能选');
  if (b.region !== undefined) regionGuard(s, b.region);
  // 编辑时只改一个数也要守住“当前上限 ≤ 硬上限”、结束晚于开始（测试 P2）
  {
    const { rows: cur } = await getPool().query<{ capacity: number | null; hard_capacity: number | null; starts_at: Date; ends_at: Date | null; checkin_starts_at: Date | null }>(`SELECT capacity, hard_capacity, starts_at, ends_at, checkin_starts_at FROM events WHERE id = $1`, [id]);
    const c0 = cur[0];
    if (c0) {
      const cap = b.capacity !== undefined ? (b.capacity === null || b.capacity === ('' as unknown) ? null : Number(b.capacity)) : c0.capacity;
      const hard = b.hardCapacity !== undefined ? (b.hardCapacity === null || b.hardCapacity === ('' as unknown) ? null : Number(b.hardCapacity)) : c0.hard_capacity;
      if (cap != null && hard != null && cap > hard) throw new CrmError('bad_request', '当前上限不能超过硬上限（场地坐得下的极限）');
      const st = b.startsAt !== undefined ? new Date(String(b.startsAt)) : c0.starts_at;
      const en = b.endsAt !== undefined ? (b.endsAt ? new Date(b.endsAt) : null) : c0.ends_at;
      if (en && st && en.getTime() <= new Date(st).getTime()) throw new CrmError('bad_request', '结束时间要晚于开始时间');
      const ck = b.checkinStartsAt !== undefined ? (b.checkinStartsAt ? new Date(b.checkinStartsAt) : null) : c0.checkin_starts_at;
      if (ck && st && ck.getTime() > new Date(st).getTime()) throw new CrmError('bad_request', '签到开始时间不能晚于活动开始时间');
    }
  }
  if (s.regions?.length && !s.roles.includes('admin')) {
    const { rows: r0 } = await getPool().query<{ region: string }>(`SELECT region FROM events WHERE id = $1`, [id]);
    if (r0[0]) regionGuard(s, r0[0].region);
  }
  const f = eventFields(b, true);
  if (!Object.keys(f).length) throw new CrmError('bad_request', '没有要修改的内容');
  return withTransaction(async (db) => {
    const { rows: before } = await db.query(`SELECT * FROM events WHERE id = $1 FOR UPDATE`, [id]);
    if (!before[0]) throw new CrmError('not_found', '找不到这场活动');
    const keys = Object.keys(f);
    await db.query(
      `UPDATE events SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = now() WHERE id = $1`,
      [id, ...Object.values(f)]
    );
    await audit(db, s, 'update_event', 'event', id, {
      before: Object.fromEntries(keys.map((k) => [k, before[0][k]])),
      after: f
    });
    return { id };
  });
}

export async function regenerateCheckinSecret(s: Staff, id: string) {
  return withTransaction(async (db) => {
    const secret = randomBytes(16).toString('hex');
    const { rowCount } = await db.query(`UPDATE events SET checkin_secret = $2, updated_at = now() WHERE id = $1`, [id, secret]);
    if (!rowCount) throw new CrmError('not_found', '找不到这场活动');
    await audit(db, s, 'regenerate_checkin_code', 'event', id, { reason: '旧签到码作废' });
    return { secret };
  });
}

// ── 现场签到台 ────────────────────────────────────────────────────────────
export async function searchPeople(q: string, eventId?: string | null) {
  const t = q.trim();
  if (t.length < 1) return [];
  const phone = normalizePhone(t);
  const email = normalizeEmail(t);
  const digits = t.replace(/\D/g, '');
  const { rows } = await getPool().query(
    // 小程序报名填的手机号 / 邮箱只存在 contact_methods（当前值），签到台也要能按它们查到人。
    `SELECT c.id, c.member_no::int, c.name, c.name_alt,
            COALESCE(c.email, me.value) AS email, COALESCE(c.phone_e164, mp.value) AS phone_e164, c.role_sub,
            r.status AS reg_status, r.arrival_status, r.checked_in_at
       FROM contacts c
       LEFT JOIN registrations r ON r.contact_id = c.id AND r.event_id = $5
       LEFT JOIN contact_methods me ON me.contact_id = c.id AND me.kind = 'email' AND me.is_current
       LEFT JOIN contact_methods mp ON mp.contact_id = c.id AND mp.kind = 'phone' AND mp.is_current
      WHERE c.name ILIKE $1 OR c.name_alt ILIKE $1
         OR ($2::text IS NOT NULL AND (c.phone_e164 = $2 OR mp.value = $2))
         OR ($3::text IS NOT NULL AND (c.email = $3 OR lower(me.value) = $3)) OR c.email ILIKE $1 OR me.value ILIKE $1
         OR (length($4) >= 4 AND (c.phone_e164 LIKE '%' || $4 OR mp.value LIKE '%' || $4)) OR c.member_no::text = $6
      ORDER BY (r.status IS NOT NULL) DESC, c.name LIMIT 30`,
    [`%${t}%`, phone, email, digits, eventId || null, t]
  );
  return rows.map((r) => ({ ...r, role_label: findRoleSub(r.role_sub)?.label ?? null }));
}

async function eventById(db: Db, id: string): Promise<EventRow> {
  const { rows } = await db.query<EventRow>(`SELECT * FROM events WHERE id = $1`, [id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  return rows[0];
}

/** 工作人员代签到：同样套用入场判断（收费活动未核款不显示签到成功）。 */
export async function staffCheckIn(s: Staff, eventId: string, contactId: string) {
  return withTransaction(async (db) => {
    const ev = await eventById(db, eventId);
    const r = await checkIn(db, ev, contactId, 'staff');
    await db.query(
      `UPDATE registrations SET checkin_by = $3 WHERE event_id = $1 AND contact_id = $2 AND arrival_status = 'checked_in' AND checkin_by IS NULL`,
      [eventId, contactId, actor(s)]
    );
    await audit(db, s, 'staff_checkin', 'contact', contactId, { after: { event: ev.slug, result: r.kind } });
    return r;
  });
}

/** 现场登记（不会扫码 / 没手机）：最少三项建档 → 报名 → 签到。 */
export async function onsiteRegister(
  s: Staff,
  eventId: string,
  b: { name?: string; phone?: string; email?: string; roleSub?: string }
) {
  const name = str(b.name, 100);
  if (!name) throw new CrmError('bad_request', '请填写姓名');
  const phone = b.phone ? normalizePhone(b.phone) : null;
  const email = b.email ? normalizeEmail(b.email) : null;
  if (b.phone && !phone) throw new CrmError('bad_request', '手机号格式不对，美国号码 10 位，其他国家请加 +国家码');
  if (b.email && !email) throw new CrmError('bad_request', '邮箱格式不对');
  if (!phone && !email) throw new CrmError('bad_request', '请填写手机号或邮箱');
  const role = findRoleSub(b.roleSub || 'other');
  if (!role) throw new CrmError('bad_request', '请选择主要行业');
  return withTransaction(async (db) => {
    const ev = await eventById(db, eventId);
    const c = await staffFindOrCreate(db, { phone, email }, name);
    const out = await startRegistration(db, ev, c.id, { source: 'staff' });
    const { answered } = await loadProfile(db, c.id);
    if (!answered.has('Q03')) {
      await submitAnswers(db, c.id, out.task, [
        { code: 'Q01', value: { text: name } },
        { code: 'Q02', value: phone ? { phone } : { email: email! } },
        { code: 'Q03', value: { category: role.category, sub: role.key } }
      ]);
    }
    const r = await checkIn(db, ev, c.id, 'staff');
    await db.query(
      `UPDATE registrations SET checkin_by = $3 WHERE event_id = $1 AND contact_id = $2 AND checkin_by IS NULL`,
      [eventId, c.id, actor(s)]
    );
    await audit(db, s, 'onsite_register', 'contact', c.id, { after: { event: ev.slug, result: r.kind, created: c.created } });
    return { contactId: c.id, created: c.created, result: r };
  });
}

/**
 * 工作人员代录：只按“已验证”的手机号 / 邮箱认人（未验证的值不用来合并档案）。
 * 找不到就新建；代录的联系方式记为未验证，被别的档案占用的值不写进身份，只记在联系方式里。
 */
async function staffFindOrCreate(db: Db, v: { phone: string | null; email: string | null }, name: string): Promise<{ id: string; created: boolean }> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM contacts
      WHERE ($1::text IS NOT NULL AND phone_e164 = $1 AND phone_verified_at IS NOT NULL)
         OR ($2::text IS NOT NULL AND email = $2 AND email_verified_at IS NOT NULL)
      ORDER BY created_at LIMIT 1`,
    [v.phone, v.email]
  );
  if (rows[0]) return { id: rows[0].id, created: false };
  const free = async (col: 'phone_e164' | 'email', val: string | null) => {
    if (!val) return null;
    const { rows: t } = await db.query(`SELECT 1 FROM contacts WHERE ${col} = $1`, [val]);
    return t[0] ? null : val;
  };
  const { rows: ins } = await db.query<{ id: string }>(
    `INSERT INTO contacts (name, phone_e164, email, acquisition_source) VALUES ($1, $2, $3, 'onsite_staff') RETURNING id`,
    [name, await free('phone_e164', v.phone), await free('email', v.email)]
  );
  const id = ins[0].id;
  if (v.phone) await setMethod(db, id, 'phone', v.phone, 'staff');
  if (v.email) await setMethod(db, id, 'email', v.email, 'staff');
  return { id, created: true };
}

// ── 核款工作台 ────────────────────────────────────────────────────────────
export async function listOrders(f: { status?: string | null; purpose?: string | null; q?: string | null }) {
  const status = f.status && f.status !== 'open' ? f.status : null;
  const q = (f.q ?? '').trim();
  const { rows } = await getPool().query(
    `SELECT o.order_no, o.purpose, o.description, o.amount_cents, o.gross_cents, o.points_redeemed, o.status, o.provider,
            o.payer_name, o.payer_note, o.submitted_at, o.paid_at, o.verified_by, o.bank_reference, o.reject_reason, o.created_at,
            c.id AS contact_id, c.name, c.email, c.phone_e164, c.member_no::int
       FROM orders o JOIN contacts c ON c.id = o.contact_id
      WHERE ($1::text IS NULL AND o.status IN ('payment_submitted','pending_payment') OR o.status = $1)
        AND ($2::text IS NULL OR o.purpose = $2)
        AND ($3 = '' OR o.order_no ILIKE '%' || $3 || '%' OR c.name ILIKE '%' || $3 || '%' OR c.email ILIKE '%' || $3 || '%')
      ORDER BY CASE o.status WHEN 'payment_submitted' THEN 0 WHEN 'pending_payment' THEN 1 ELSE 2 END,
               coalesce(o.submitted_at, o.created_at) DESC
      LIMIT 200`,
    [status, f.purpose || null, q]
  );
  return rows.map((o) => ({
    ...o,
    purpose_label: PURPOSE_LABEL[o.purpose as keyof typeof PURPOSE_LABEL],
    status_label: STATUS_LABEL[o.status as keyof typeof STATUS_LABEL],
    pay_link: o.status === 'pending_payment' || o.status === 'payment_submitted' ? safeLink(o.order_no) : null
  }));
}

export async function verifyOrder(s: Staff, orderNo: string, reference?: string | null) {
  const r = await markOrderPaid(orderNo, { staff: s.name, provider: 'zelle', reference: str(reference, 120) || null });
  if (!r.order) throw new CrmError('not_found', '找不到这个订单');
  return {
    changed: r.changed,
    status: r.order.status,
    message: r.changed ? '已确认到账' : r.order.status === 'paid' ? '这笔已经确认过了，不会重复处理' : `订单状态为「${STATUS_LABEL[r.order.status]}」，不能确认`
  };
}

export async function rejectOrder(s: Staff, orderNo: string, reason: string) {
  const why = str(reason, 300);
  if (!why) throw new CrmError('bad_request', '请填写原因，例如“核实未到账”');
  const changed = await cancelOrder(orderNo, actor(s), why);
  return { changed, message: changed ? '已标记未到账并取消订单' : '订单已处理过，不会重复处理' };
}

// ── 客户查询 ──────────────────────────────────────────────────────────────
export type ContactFilter = {
  q?: string | null;
  region?: string | null;
  roleCategory?: string | null;
  topic?: string | null;
  tag?: string | null;
  member?: 'member' | 'registered' | null;
  /** 邮箱状态：confirmed 已确认 / unconfirmed 未确认 / invalid 无效 / none 没填 */
  emailStatus?: 'confirmed' | 'unconfirmed' | 'invalid' | 'none' | null;
};

export async function searchContacts(f: ContactFilter, limit = 200) {
  const q = (f.q ?? '').trim();
  const phone = q ? normalizePhone(q) : null;
  const { rows } = await getPool().query(
    `WITH m AS (
       SELECT DISTINCT ON (a.contact_id) a.contact_id, a.selected_tier_slug, a.membership_end_date
         FROM applications a
        WHERE a.contact_id IS NOT NULL AND a.membership_end_date >= current_date
          AND (a.application_status IN ('approved','paid','second_payment_due')
               OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))
        ORDER BY a.contact_id, a.membership_end_date DESC)
     SELECT c.id, c.member_no::int, c.name, c.name_alt, c.email, c.phone_e164, c.role_category, c.role_sub, c.created_at,
            m.selected_tier_slug AS tier, m.membership_end_date::text AS member_until,
            (SELECT coalesce(sum(points),0)::int FROM points_ledger p WHERE p.contact_id = c.id) AS points,
            (SELECT array_agg(DISTINCT t.tag) FROM contact_tags t WHERE t.contact_id = c.id) AS tags,
            (SELECT count(*)::int FROM registrations r WHERE r.contact_id = c.id AND r.arrival_status = 'checked_in') AS attended,
            me.value AS cur_email, me.status AS email_status, mp.value AS cur_phone, mp.status AS phone_status
       FROM contacts c LEFT JOIN m ON m.contact_id = c.id
       LEFT JOIN contact_methods me ON me.contact_id = c.id AND me.kind = 'email' AND me.is_current
       LEFT JOIN contact_methods mp ON mp.contact_id = c.id AND mp.kind = 'phone' AND mp.is_current
      WHERE ($1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.name_alt ILIKE '%' || $1 || '%' OR c.email ILIKE '%' || $1 || '%'
             OR me.value ILIKE '%' || $1 || '%'
             OR ($2::text IS NOT NULL AND (c.phone_e164 = $2 OR mp.value = $2)) OR c.member_no::text = $1)
        AND ($9::text IS NULL OR coalesce(me.status, 'none') = $9)
        AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag = '区域:' || $3))
        AND ($4::text IS NULL OR c.role_category = $4)
        AND ($5::text IS NULL OR EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag = '主题:' || $5))
        AND ($6::text IS NULL OR EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag ILIKE '%' || $6 || '%'))
        AND ($7::text IS NULL OR ($7 = 'member' AND m.contact_id IS NOT NULL) OR ($7 = 'registered' AND m.contact_id IS NULL))
      ORDER BY c.created_at DESC LIMIT $8`,
    [q, phone, f.region || null, f.roleCategory || null, f.topic || null, f.tag || null, f.member || null, limit, f.emailStatus || null]
  );
  return rows.map((r) => ({
    ...r,
    role_label: findRoleSub(r.role_sub)?.label ?? null,
    email_status_text: r.email_status ? STATUS_TEXT.email[r.email_status as MethodStatus] : '无',
    phone_status_text: r.phone_status ? STATUS_TEXT.phone[r.phone_status as MethodStatus] : '无'
  }));
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : Array.isArray(v) ? v.join('；') : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportContactsCsv(s: Staff, f: ContactFilter): Promise<string> {
  const rows = await searchContacts(f, 5000);
  const head = ['会员编号', '姓名', '另一姓名', '邮箱', '邮箱状态', '手机', '手机状态', '行业', '会员等级', '会员到期', '积分', '到场次数', '标签', '建档时间'];
  const lines = rows.map((r) =>
    [r.member_no, r.name, r.name_alt, r.cur_email ?? r.email, r.email_status_text, r.cur_phone ?? r.phone_e164, r.phone_status_text, r.role_label, r.tier ?? '注册用户', r.member_until, r.points, r.attended, r.tags, r.created_at]
      .map(csvCell)
      .join(',')
  );
  await audit(getPool(), s, 'export_contacts', 'contact', 'filter', { after: { filter: f, count: rows.length } });
  return '﻿' + [head.join(','), ...lines].join('\r\n');
}

export async function contactDetail(id: string) {
  const pool = getPool();
  const { rows: c } = await pool.query(`SELECT c.*, c.member_no::int AS member_no FROM contacts c WHERE c.id = $1`, [id]);
  if (!c[0]) throw new CrmError('not_found', '找不到这个人');
  const { rows: tags } = await pool.query(`SELECT tag, source, created_at FROM contact_tags WHERE contact_id = $1 ORDER BY tag`, [id]);
  const { rows: answers } = await pool.query(
    `SELECT a.item_code, a.value, a.is_unknown, a.source, a.status, a.recorded_by, a.expires_at, a.note, a.created_at,
            e.title AS task_event
       FROM profile_answers a LEFT JOIN profile_tasks t ON t.id = a.task_id LEFT JOIN events e ON e.id = t.event_id
      WHERE a.contact_id = $1 ORDER BY a.item_code, a.created_at DESC`,
    [id]
  );
  const { rows: points } = await pool.query(
    `SELECT id, category, points, reason, event_key, created_by, reverses_id, created_at FROM points_ledger WHERE contact_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  const { rows: apps } = await pool.query(
    `SELECT id, application_type, selected_tier_slug, application_status, payment_status, membership_start_date::text,
            membership_end_date::text, display_status, is_approved_for_display, company_name, created_at
       FROM applications WHERE contact_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  const { rows: tl } = await pool.query(
    `SELECT * FROM (
       SELECT r.created_at AS at, 'registration' AS kind, '报名：' || e.title || CASE r.status WHEN 'waitlisted' THEN '（候补）' WHEN 'cancelled' THEN '（已取消）' ELSE '' END || '，来源 ' || r.source AS text
         FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.contact_id = $1
       UNION ALL
       SELECT r.checked_in_at, 'checkin', '签到：' || e.title || coalesce('（' || r.checkin_method || '）', '')
         FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.contact_id = $1 AND r.checked_in_at IS NOT NULL
       UNION ALL
       SELECT r.arrived_at, 'arrival', '到场待核款：' || e.title
         FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.contact_id = $1 AND r.arrival_status = 'arrived_pending_payment'
       UNION ALL
       SELECT r.cancelled_at, 'cancel', '取消报名：' || e.title
         FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.contact_id = $1 AND r.cancelled_at IS NOT NULL
       UNION ALL
       SELECT o.created_at, 'order', '下单 ' || o.order_no || '：' || coalesce(o.description, o.purpose) || ' $' || (o.amount_cents / 100.0)::numeric(10,2)
         FROM orders o WHERE o.contact_id = $1
       UNION ALL
       SELECT o.submitted_at, 'payment_note', '提交付款说明 ' || o.order_no || coalesce('：' || o.payer_note, '')
         FROM orders o WHERE o.contact_id = $1 AND o.submitted_at IS NOT NULL
       UNION ALL
       SELECT o.paid_at, 'paid', '到账 ' || o.order_no || '（' || o.provider || coalesce('，' || o.verified_by, '') || '）'
         FROM orders o WHERE o.contact_id = $1 AND o.paid_at IS NOT NULL
       UNION ALL
       SELECT p.created_at, 'points', '积分 ' || CASE WHEN p.points > 0 THEN '+' ELSE '' END || p.points || '：' || coalesce(p.reason, p.category)
         FROM points_ledger p WHERE p.contact_id = $1
       UNION ALL
       SELECT b.created_at, 'room', '会议室预约 ' || to_char(b.starts_at AT TIME ZONE 'America/Los_Angeles', 'MM-DD HH24:MI') || '–' || to_char(b.ends_at AT TIME ZONE 'America/Los_Angeles', 'HH24:MI') || '（' || b.status || '）'
         FROM room_bookings b WHERE b.contact_id = $1
       UNION ALL
       SELECT a.created_at, 'application', '会费申请：' || a.selected_tier_slug || '（' || a.application_status || '/' || a.payment_status || '）'
         FROM applications a WHERE a.contact_id = $1
       UNION ALL
       SELECT l.created_at, 'audit', l.action || '（' || l.actor || '）' || coalesce('：' || l.reason, '')
         FROM crm_audit_log l WHERE l.target_type = 'contact' AND l.target_id = $1::text
       UNION ALL
       SELECT x.created_at, 'answer', '资料 ' || x.item_code || '（' || x.source || '）'
         FROM profile_answers x WHERE x.contact_id = $1
     ) t WHERE at IS NOT NULL ORDER BY at DESC LIMIT 500`,
    [id]
  );
  const { rows: methods } = await pool.query(
    `SELECT kind, value, status, is_current, source, confirmed_at, invalid_at, invalid_reason, created_at, replaced_at
       FROM contact_methods WHERE contact_id = $1 ORDER BY kind, is_current DESC, created_at DESC`,
    [id]
  );
  const balance = points.reduce((n, p) => n + Number(p.points), 0);
  return {
    contact: c[0],
    contactMethods: methods.map((m) => ({ ...m, status_text: STATUS_TEXT[m.kind as 'email' | 'phone'][m.status as MethodStatus] })),
    roleLabel: findRoleSub(c[0].role_sub)?.label ?? null,
    tags,
    answers: answers.map((a) => ({ ...a, prompt: QUESTION_BY_CODE[a.item_code]?.prompt ?? a.item_code })),
    points: { balance, ledger: points },
    applications: apps,
    timeline: tl
  };
}

// ── 积分调整（必须填原因）──────────────────────────────────────────────────
export async function adjustPoints(s: Staff, contactId: string, points: number, reason: string) {
  const why = str(reason, 300);
  if (!why) throw new CrmError('bad_request', '调整积分必须填写原因');
  const n = Math.trunc(Number(points));
  if (!n || Math.abs(n) > 100000) throw new CrmError('bad_request', '请填写要增加或扣减的积分（负数为扣减）');
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, created_by)
       VALUES ($1, 'adjust', $2, $3, $4, $5) RETURNING id`,
      [contactId, n, `adjust:${randomUUID()}`, why, actor(s)]
    );
    await audit(db, s, 'adjust_points', 'contact', contactId, { after: { points: n, ledger: rows[0].id }, reason: why });
    return { id: rows[0].id };
  });
}

export async function reversePoints(s: Staff, ledgerId: string, reason: string) {
  const why = str(reason, 300);
  if (!why) throw new CrmError('bad_request', '撤销积分必须填写原因');
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; contact_id: string; points: number }>(
      `SELECT id, contact_id, points FROM points_ledger WHERE id = $1`,
      [ledgerId]
    );
    if (!rows[0]) throw new CrmError('not_found', '找不到这笔积分');
    const { rows: ins } = await db.query<{ id: string }>(
      `INSERT INTO points_ledger (contact_id, category, points, event_key, reason, reverses_id, created_by)
       VALUES ($1, 'adjust', $2, $3, $4, $5, $6) ON CONFLICT (event_key) DO NOTHING RETURNING id`,
      [rows[0].contact_id, -rows[0].points, `reverse:${ledgerId}`, `撤销：${why}`, ledgerId, actor(s)]
    );
    if (!ins[0]) return { changed: false, message: '这笔积分已经撤销过了' };
    await audit(db, s, 'reverse_points', 'contact', rows[0].contact_id, { after: { ledger: ledgerId }, reason: why });
    return { changed: true, message: '已撤销' };
  });
}

// ── 会议室与电子屏 ────────────────────────────────────────────────────────
export async function listBookings(from: string, to: string) {
  const { rows } = await getPool().query(
    `SELECT b.id, r.name AS room, b.starts_at, b.ends_at, b.status, b.purpose, b.pass_id IS NOT NULL AS via_pass,
            c.id AS contact_id, c.name, c.phone_e164, c.email, o.order_no, o.status AS order_status, o.amount_cents
       FROM room_bookings b JOIN rooms r ON r.id = b.room_id JOIN contacts c ON c.id = b.contact_id LEFT JOIN orders o ON o.id = b.order_id
      WHERE b.starts_at < $2 AND b.ends_at > $1 ORDER BY b.starts_at`,
    [new Date(from), new Date(to)]
  );
  return rows;
}

export async function staffCancelBooking(s: Staff, id: string, reason: string) {
  const why = str(reason, 300) || '工作人员取消';
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ status: string; contact_id: string; order_no: string | null; order_status: string | null }>(
      `SELECT b.status, b.contact_id, o.order_no, o.status AS order_status FROM room_bookings b LEFT JOIN orders o ON o.id = b.order_id WHERE b.id = $1 FOR UPDATE OF b`,
      [id]
    );
    if (!rows[0]) throw new CrmError('not_found', '找不到这个预约');
    if (rows[0].status === 'cancelled') return { changed: false };
    await db.query(`UPDATE room_bookings SET status = 'cancelled' WHERE id = $1`, [id]);
    if (rows[0].order_no && ['pending_payment', 'payment_submitted'].includes(rows[0].order_status ?? '')) {
      await db.query(`UPDATE orders SET status = 'cancelled', reject_reason = $2, updated_at = now() WHERE order_no = $1`, [rows[0].order_no, why]);
    }
    await audit(db, s, 'cancel_booking', 'contact', rows[0].contact_id, { after: { booking: id }, reason: why });
    return { changed: true };
  });
}

export async function listScreenAds(status?: string | null) {
  const { rows } = await getPool().query(
    `SELECT s.*, s.start_month::text AS start_month, c.name, c.email, c.phone_e164, o.order_no, o.status AS order_status
       FROM screen_ads s JOIN contacts c ON c.id = s.contact_id LEFT JOIN orders o ON o.id = s.order_id
      WHERE ($1::text IS NULL OR s.status = $1) ORDER BY s.created_at DESC LIMIT 200`,
    [status || null]
  );
  return rows;
}

export async function reviewScreenAd(
  s: Staff,
  id: string,
  b: { action?: 'approve' | 'reject' | 'schedule'; startMonth?: string; note?: string }
) {
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ id: string; contact_id: string; status: string; months: number; tier_at_apply: string | null; org_name: string; order_id: string | null }>(
      `SELECT id, contact_id, status, months, tier_at_apply, org_name, order_id FROM screen_ads WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const ad = rows[0];
    if (!ad) throw new CrmError('not_found', '找不到这条申请');
    const note = str(b.note, 300) || null;
    if (b.action === 'reject') {
      if (!note) throw new CrmError('bad_request', '请填写不通过的原因，会员能看到');
      await db.query(`UPDATE screen_ads SET status = 'rejected', staff_note = $2, updated_at = now() WHERE id = $1`, [id, note]);
      if (ad.order_id) await db.query(`UPDATE orders SET status = 'cancelled', reject_reason = $2, updated_at = now() WHERE id = $1 AND status = 'pending_payment'`, [ad.order_id, note]);
      await audit(db, s, 'reject_screen_ad', 'contact', ad.contact_id, { after: { ad: id }, reason: note });
      return { status: 'rejected', orderNo: null };
    }
    const startMonth = b.startMonth && /^\d{4}-\d{2}$/.test(b.startMonth) ? `${b.startMonth}-01` : null;
    if (b.action === 'schedule') {
      await db.query(
        `UPDATE screen_ads SET status = 'scheduled', start_month = COALESCE($2, start_month), staff_note = COALESCE($3, staff_note), updated_at = now() WHERE id = $1`,
        [id, startMonth, note]
      );
      await audit(db, s, 'schedule_screen_ad', 'contact', ad.contact_id, { after: { ad: id, startMonth } });
      return { status: 'scheduled', orderNo: null };
    }
    if (ad.status !== 'submitted') throw new CrmError('conflict', '这条申请已经审核过了');
    const fees = await getSetting<Record<string, number>>(db, 'screen_fee_cents', {});
    const tier = ad.tier_at_apply ?? 'none';
    const free = tier === 'vp' || tier === 'strategic_partner';
    const monthly = free ? 0 : Number(fees[tier] ?? fees.none ?? 5000);
    const amount = monthly * ad.months;
    let orderNo: string | null = null;
    if (amount > 0) {
      orderNo = newOrderNo();
      const { rows: o } = await db.query<{ id: string }>(
        `INSERT INTO orders (order_no, contact_id, purpose, related_id, description, amount_cents, gross_cents)
         VALUES ($1, $2, 'screen_ad', $3, $4, $5, $5) RETURNING id`,
        [orderNo, ad.contact_id, id, `电子屏轮播 ${ad.org_name} ${ad.months} 个月`, amount]
      );
      await db.query(`UPDATE screen_ads SET order_id = $2 WHERE id = $1`, [id, o[0].id]);
    }
    await db.query(
      `UPDATE screen_ads SET status = 'approved', amount_cents = $2, start_month = COALESCE($3, start_month), staff_note = COALESCE($4, staff_note), updated_at = now() WHERE id = $1`,
      [id, amount, startMonth, note]
    );
    await audit(db, s, 'approve_screen_ad', 'contact', ad.contact_id, { after: { ad: id, amount, orderNo } });
    return { status: 'approved', orderNo, amountCents: amount };
  });
}

// ── 配置（管理员）──────────────────────────────────────────────────────────
export const SETTING_KEYS = ['room_discount', 'screen_fee_cents', 'member_prices_published', 'points_per_dollar', 'room_pass_cents', 'zelle_enabled'] as const;

export async function getSettings() {
  const pool = getPool();
  const { rows } = await pool.query<{ key: string; value: unknown; updated_by: string | null; updated_at: Date }>(
    `SELECT key, value, updated_by, updated_at FROM crm_settings ORDER BY key`
  );
  const { rows: rooms } = await pool.query(`SELECT id, name, hourly_cents, is_active FROM rooms ORDER BY id`);
  const { rows: offers } = await pool.query(`SELECT *, valid_until::text AS valid_until FROM merchant_offers ORDER BY sort_order, merchant`);
  const { rows: staff } = await pool.query(`SELECT email, name, roles, is_active, updated_at, (mp_contact_id IS NOT NULL) AS mp_bound, mp_bound_at FROM staff_roles ORDER BY name`).catch(() => pool.query(`SELECT email, name, roles, is_active, updated_at FROM staff_roles ORDER BY name`));
  return { settings: rows, rooms, offers, staff };
}

export async function updateSetting(s: Staff, key: string, value: unknown) {
  if (!(SETTING_KEYS as readonly string[]).includes(key)) throw new CrmError('bad_request', '不能修改这个配置');
  if ((key === 'member_prices_published' || key === 'zelle_enabled') && typeof value !== 'boolean') throw new CrmError('bad_request', '请选择是或否');
  if ((key === 'points_per_dollar' || key === 'room_pass_cents') && !(Number(value) > 0)) throw new CrmError('bad_request', '请填写正数');
  if ((key === 'room_discount' || key === 'screen_fee_cents') && (typeof value !== 'object' || value === null || Array.isArray(value))) {
    throw new CrmError('bad_request', '格式不对');
  }
  if (key === 'room_discount') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (!(Number(v) > 0 && Number(v) <= 1)) throw new CrmError('bad_request', '折扣请填 0–1 之间的小数，例如 9 折填 0.9');
    }
  }
  return withTransaction(async (db) => {
    const before = await getSetting(db, key, null);
    await setSetting(db, key, typeof value === 'number' || typeof value === 'boolean' ? value : value, s.name);
    await audit(db, s, 'update_setting', 'setting', key, { before, after: value });
    return { key };
  });
}

export async function upsertRoom(s: Staff, b: { id?: number; name?: string; hourlyCents?: number; isActive?: boolean }) {
  const name = str(b.name, 100);
  const cents = Math.max(0, Math.round(Number(b.hourlyCents) || 0));
  return withTransaction(async (db) => {
    let id = b.id;
    if (id) {
      await db.query(
        `UPDATE rooms SET name = COALESCE(NULLIF($2, ''), name), hourly_cents = $3, is_active = COALESCE($4, is_active) WHERE id = $1`,
        [id, name, cents, b.isActive ?? null]
      );
    } else {
      if (!name) throw new CrmError('bad_request', '请填写会议室名称');
      const { rows } = await db.query<{ id: number }>(`INSERT INTO rooms (name, hourly_cents) VALUES ($1, $2) RETURNING id`, [name, cents]);
      id = rows[0].id;
    }
    await audit(db, s, 'upsert_room', 'room', String(id), { after: { name, cents, isActive: b.isActive } });
    return { id };
  });
}

export async function upsertOffer(
  s: Staff,
  b: { id?: string; merchant?: string; category?: string; offer?: string; conditions?: string; contact?: string; validUntil?: string | null; isActive?: boolean; sortOrder?: number; delete?: boolean }
) {
  return withTransaction(async (db) => {
    if (b.id && b.delete) {
      await db.query(`DELETE FROM merchant_offers WHERE id = $1`, [b.id]);
      await audit(db, s, 'delete_offer', 'offer', b.id);
      return { id: b.id };
    }
    const merchant = str(b.merchant, 120);
    const offer = str(b.offer, 500);
    if (!merchant || !offer) throw new CrmError('bad_request', '请填写商家和优惠内容');
    const vals = [merchant, str(b.category, 60) || null, offer, str(b.conditions, 500) || null, str(b.contact, 200) || null, b.validUntil || null, b.isActive ?? true, Number(b.sortOrder) || 0];
    let id = b.id;
    if (id) {
      await db.query(
        `UPDATE merchant_offers SET merchant=$2, category=$3, offer=$4, conditions=$5, contact=$6, valid_until=$7, is_active=$8, sort_order=$9 WHERE id = $1`,
        [id, ...vals]
      );
    } else {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO merchant_offers (merchant, category, offer, conditions, contact, valid_until, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        vals
      );
      id = rows[0].id;
    }
    await audit(db, s, 'upsert_offer', 'offer', id!, { after: { merchant, offer } });
    return { id };
  });
}

const ROLE_VALUES = ['checkin', 'finance', 'ops', 'admin'];

export async function upsertStaffRole(s: Staff, b: { email?: string; name?: string; roles?: string[]; isActive?: boolean }) {
  const email = normalizeEmail(String(b.email ?? ''));
  if (!email) throw new CrmError('bad_request', '请填写工作人员邮箱');
  const roles = (b.roles ?? []).filter((r) => ROLE_VALUES.includes(r));
  const name = str(b.name, 60) || email.split('@')[0];
  if (email === s.email && (!roles.includes('admin') || b.isActive === false)) {
    throw new CrmError('bad_request', '不能取消自己的管理员权限，避免没人能管理后台');
  }
  // 1.3.1 F：旧的“设置 → 工作人员”也不能停掉 / 降级最后一个能登录的管理员
  if (!roles.includes('admin') || b.isActive === false) {
    const { rows: cur } = await getPool().query<{ roles: string[]; is_active: boolean }>(`SELECT roles, is_active FROM staff_roles WHERE email = $1`, [email]);
    if (cur[0]?.is_active && cur[0].roles.includes('admin')) {
      const { assertOtherAdmin } = await import('@/lib/crm/team');
      await assertOtherAdmin(email);
    }
  }
  return withTransaction(async (db) => {
    await db.query(
      `INSERT INTO staff_roles (email, name, roles, is_active) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, roles = EXCLUDED.roles, is_active = EXCLUDED.is_active, updated_at = now()`,
      [email, name, roles, b.isActive ?? true]
    );
    await audit(db, s, 'upsert_staff', 'staff', email, { after: { roles, isActive: b.isActive ?? true } });
    return { email };
  });
}

// ── 官网展示审核（不影响会员身份）─────────────────────────────────────────
export const DISPLAY_STATUSES = ['not_submitted', 'pending_review', 'approved', 'rejected', 'published', 'expired', 'hidden'] as const;

export async function listDisplayReview() {
  const { rows } = await getPool().query(
    `SELECT a.id, a.application_type, a.selected_tier_slug, a.application_status, a.payment_status, a.company_name, a.contact_name,
            a.email, a.website_url, a.company_description, a.display_status, a.is_approved_for_display,
            a.membership_end_date::text, a.created_at, a.contact_id
       FROM applications a
      WHERE a.application_status IN ('approved','paid','second_payment_due','under_review')
      ORDER BY CASE a.display_status WHEN 'pending_review' THEN 0 WHEN 'not_submitted' THEN 1 ELSE 2 END, a.created_at DESC LIMIT 300`
  );
  return rows;
}

export async function setDisplay(s: Staff, applicationId: string, displayStatus: string, note?: string) {
  if (!(DISPLAY_STATUSES as readonly string[]).includes(displayStatus)) throw new CrmError('bad_request', '展示状态不对');
  return withTransaction(async (db) => {
    const { rows } = await db.query<{ display_status: string; contact_id: string | null }>(
      `SELECT display_status, contact_id FROM applications WHERE id = $1 FOR UPDATE`,
      [applicationId]
    );
    if (!rows[0]) throw new CrmError('not_found', '找不到这份申请');
    const approved = displayStatus === 'approved' || displayStatus === 'published';
    // 只改展示字段；会员身份（application_status / 有效期）不动
    await db.query(
      `UPDATE applications SET display_status = $2, is_approved_for_display = $3, display_on_website = $3, updated_at = now() WHERE id = $1`,
      [applicationId, displayStatus, approved]
    );
    await audit(db, s, 'set_display', 'application', applicationId, {
      before: { display_status: rows[0].display_status },
      after: { display_status: displayStatus },
      reason: str(note, 300) || null
    });
    return { id: applicationId, displayStatus };
  });
}
