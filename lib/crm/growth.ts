/**
 * SAREC 1.2：点击统计、推荐统计、首页“服务台”数据（小程序首页与网站手机版共用）
 * ------------------------------------------------------------------
 * - 点击统计：首页每个入口、分享、海报生成、名片打开都打点（track_events），后台能看。
 * - 推荐统计记真实结果：带来源的访问 → 报名 → 到场 → 入会。生成海报、点分享不算推荐结果。
 *   重复报名、自己推荐自己去重；首次推荐人（contacts.referred_by）和本次活动来源（registrations.ref_contact_id）分开。
 *   会员端只显示三个数字，不显示被邀请人的联系方式和缴费情况。
 * - 首页状态卡按人变：未报名 / 已报名未开始 / 活动当天 / 活动结束。
 */
import QRCode from 'qrcode';
import { getPool } from '@/lib/db/client';
import { getSetting } from './orders';
import { memberStatus } from './membership';
import type { Db } from './profile';
import { unseenAlbums } from './photos';
import { CHANNEL_RE } from './channels';

// ── 点击统计 ───────────────────────────────────────────────────────────

const NAME_OK = /^[a-z][a-z0-9_]{1,40}$/;
const clip = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export type TrackInput = { name: string; target?: string | null; channel?: string | null; ref?: string | number | null; meta?: Record<string, unknown> | null };

/** 推荐码（会员编号）→ 档案 id；自己推荐自己返回 null */
export async function refToContact(db: Db, ref: unknown, self: string | null): Promise<string | null> {
  const s = ref == null ? '' : String(ref).trim();
  if (!/^\d{1,9}$/.test(s)) return null;
  const { rows } = await db.query<{ id: string }>(`SELECT id FROM contacts WHERE member_no = $1`, [Number(s)]);
  const id = rows[0]?.id ?? null;
  return id && id !== self ? id : null;
}

export async function track(client: 'mp' | 'web' | 'agent' | 'server', contactId: string | null, visitor: string | null, items: TrackInput[]) {
  const pool = getPool();
  let saved = 0;
  for (const it of items.slice(0, 30)) {
    if (!NAME_OK.test(it.name)) continue;
    const refId = await refToContact(pool, it.ref, contactId);
    // 带来源的访问：同一人 / 同一访客对同一目标、同一推荐人，一天只记一次
    if (it.name === 'visit') {
      // 1.3：渠道码（c-xxxx）没有推荐人，也算带来源的访问
      const ch = clip(it.channel, 40);
      const chanOk = !!ch && CHANNEL_RE.test(ch);
      if (!refId && !chanOk) continue;
      const { rows } = await pool.query(
        `SELECT 1 FROM track_events WHERE name = 'visit' AND coalesce(ref_contact_id::text,'') = coalesce($1::text,'')
            AND coalesce(channel,'') = coalesce($5,'') AND coalesce(target,'') = coalesce($2,'')
            AND (($3::uuid IS NOT NULL AND contact_id = $3) OR ($3::uuid IS NULL AND $4::text IS NOT NULL AND visitor = $4))
            AND created_at > now() - interval '1 day' LIMIT 1`,
        [refId, clip(it.target, 120), contactId, visitor, chanOk ? ch : null]
      );
      if (rows[0]) continue;
    }
    await pool.query(
      `INSERT INTO track_events (name, client, contact_id, ref_contact_id, target, channel, visitor, meta) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [it.name, client, contactId, refId, clip(it.target, 120), clip(it.channel, 40), visitor ? visitor.slice(0, 64) : null, it.meta ? JSON.stringify(it.meta).slice(0, 2000) : null]
    );
    saved++;
  }
  return { saved };
}

/** 后台：最近 N 天各打点次数（按名称 + 目标） */
export async function trackStats(days = 30) {
  const pool = getPool();
  const { rows: byName } = await pool.query(
    `SELECT name, target, client, count(*)::int AS n, count(DISTINCT coalesce(contact_id::text, visitor))::int AS people
       FROM track_events WHERE created_at > now() - make_interval(days => $1)
      GROUP BY name, target, client ORDER BY name, n DESC LIMIT 400`,
    [days]
  );
  const { rows: daily } = await pool.query(
    `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'America/Los_Angeles'), 'YYYY-MM-DD') AS day, name, count(*)::int AS n
       FROM track_events WHERE created_at > now() - make_interval(days => $1)
      GROUP BY 1, 2 ORDER BY 1 DESC, 2`,
    [days]
  );
  return { byName, daily };
}

// ── 推荐统计 ───────────────────────────────────────────────────────────

/** 我的推荐：已邀请 / 已到场 / 已入会（只给数字） */
export async function myReferralStats(db: Db, contactId: string): Promise<{ invited: number; arrived: number; joined: number }> {
  const { rows } = await db.query<{ invited: number; arrived: number; joined: number }>(
    `WITH people AS (
       SELECT r.contact_id FROM registrations r WHERE r.ref_contact_id = $1 AND r.contact_id <> $1 AND r.status <> 'cancelled'
       UNION
       SELECT c.id FROM contacts c WHERE c.referred_by = $1 AND c.id <> $1
     )
     SELECT
       (SELECT count(*)::int FROM people) AS invited,
       (SELECT count(DISTINCT r.contact_id)::int FROM registrations r JOIN people p ON p.contact_id = r.contact_id
         WHERE r.arrival_status = 'checked_in' AND (r.ref_contact_id = $1 OR EXISTS (SELECT 1 FROM contacts c WHERE c.id = r.contact_id AND c.referred_by = $1))) AS arrived,
       (SELECT count(DISTINCT a.contact_id)::int FROM applications a JOIN people p ON p.contact_id = a.contact_id
         WHERE a.membership_start_date IS NOT NULL
           AND (a.application_status IN ('approved','paid','second_payment_due') OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))) AS joined`,
    [contactId]
  );
  return rows[0];
}

/** 后台推荐排行（只给东哥 / 工作人员看）：访问、报名、到场、入会、有效咨询 */
export async function referralLeaderboard(days = 90) {
  const { rows } = await getPool().query(
    `WITH refs AS (SELECT DISTINCT ref_contact_id AS id FROM registrations WHERE ref_contact_id IS NOT NULL
                   UNION SELECT DISTINCT referred_by FROM contacts WHERE referred_by IS NOT NULL
                   UNION SELECT DISTINCT ref_contact_id FROM track_events WHERE name = 'visit' AND ref_contact_id IS NOT NULL)
     SELECT c.id, c.member_no::int AS member_no, c.name,
       (SELECT count(*)::int FROM track_events t WHERE t.name = 'visit' AND t.ref_contact_id = c.id AND t.created_at > now() - make_interval(days => $1)) AS visits,
       (SELECT count(DISTINCT r.contact_id)::int FROM registrations r WHERE r.ref_contact_id = c.id AND r.status <> 'cancelled' AND r.created_at > now() - make_interval(days => $1)) AS registered,
       (SELECT count(DISTINCT r.contact_id)::int FROM registrations r WHERE r.ref_contact_id = c.id AND r.arrival_status = 'checked_in' AND r.created_at > now() - make_interval(days => $1)) AS arrived,
       (SELECT count(*)::int FROM contacts x WHERE x.referred_by = c.id) AS first_referred,
       (SELECT count(DISTINCT a.contact_id)::int FROM applications a JOIN contacts x ON x.id = a.contact_id
         WHERE x.referred_by = c.id AND a.membership_start_date IS NOT NULL) AS joined,
       (SELECT count(*)::int FROM inquiries i WHERE i.ref_contact_id = c.id AND i.created_at > now() - make_interval(days => $1)) AS inquiries
       FROM refs JOIN contacts c ON c.id = refs.id
      ORDER BY registered DESC, visits DESC LIMIT 100`,
    [days]
  );
  return rows;
}

// ── 首页服务台 ─────────────────────────────────────────────────────────

const TZ = 'America/Los_Angeles';
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export type HomePhase = 'none' | 'registered' | 'today' | 'ended';

type EvRow = {
  id: string; slug: string; title: string; starts_at: Date; ends_at: Date | null; location_name: string | null; address: string | null;
  fee_cents: number; capacity: number | null; registered: number; cover_url: string | null; recap: string | null; album_published_at: Date | null;
  event_status: string; registration_open: boolean; summary: string | null; topic_tags: string[];
};

function evCard(e: EvRow) {
  return {
    slug: e.slug,
    title: e.title,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    locationName: e.location_name,
    address: e.address,
    feeCents: e.fee_cents,
    seatsLeft: e.capacity != null ? Math.max(0, e.capacity - Number(e.registered ?? 0)) : null,
    coverUrl: e.cover_url,
    summary: e.summary,
    registrationOpen: e.registration_open,
    status: e.event_status,
    tags: e.topic_tags
  };
}

/** 个人签到码：工作人员用手机扫，直接打开后台签到台并定位到这条报名 */
export async function personalCheckinQr(base: string, registrationId: string): Promise<string> {
  return QRCode.toDataURL(`${base.replace(/\/$/, '')}/zh/staff/checkin?reg=${registrationId}`, { margin: 1, width: 360, color: { dark: '#06111E', light: '#F2EAD6' } });
}

export async function homeData(contactId: string | null, opts: { base: string; withQr?: boolean }) {
  const pool = getPool();
  const now = new Date();
  const { rows: upcoming } = await pool.query<EvRow>(
    `SELECT e.*, (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.status = 'registered') AS registered
       FROM events e WHERE e.is_listed AND e.event_status = 'scheduled' AND coalesce(e.ends_at, e.starts_at + interval '3 hours') > now()
      ORDER BY e.starts_at ASC LIMIT 6`
  );
  const { rows: past } = await pool.query<EvRow & { photo_count: number }>(
    `SELECT e.*, 0 AS registered,
            (SELECT count(*)::int FROM event_photos p WHERE p.event_id = e.id AND NOT p.is_hidden) AS photo_count
       FROM events e WHERE e.is_listed AND e.event_status <> 'cancelled' AND coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now()
      ORDER BY (e.album_published_at IS NOT NULL) DESC, e.starts_at DESC LIMIT 1`
  );
  let lastEvent = null as null | Record<string, unknown>;
  if (past[0]) {
    const { rows: photos } = await pool.query<{ thumb_url: string; url: string }>(
      `SELECT thumb_url, url FROM event_photos WHERE event_id = $1 AND NOT is_hidden ORDER BY sort_order, created_at LIMIT 3`,
      [past[0].id]
    );
    const { rows: att } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM registrations WHERE event_id = $1 AND arrival_status = 'checked_in'`,
      [past[0].id]
    );
    lastEvent = {
      slug: past[0].slug,
      title: past[0].title,
      startsAt: past[0].starts_at,
      recap: past[0].recap,
      attended: att[0].n,
      photoCount: past[0].photo_count,
      albumPublished: !!past[0].album_published_at,
      photos: past[0].album_published_at ? photos.map((p) => ({ thumb: p.thumb_url, url: p.url })) : []
    };
  }

  let me = null as null | Record<string, unknown>;
  let status: Record<string, unknown> = { phase: 'none' as HomePhase, event: upcoming[0] ? evCard(upcoming[0]) : null };
  let albums: unknown[] = [];
  if (contactId) {
    const { rows: c } = await pool.query<{ name: string; member_no: number; avatar_url: string | null }>(
      `SELECT name, member_no::int AS member_no, avatar_url FROM contacts WHERE id = $1`,
      [contactId]
    );
    const ms = await memberStatus(pool, contactId);
    me = {
      name: c[0]?.name && c[0].name !== '微信用户' ? c[0].name : null,
      memberNo: c[0]?.member_no ?? null,
      avatarUrl: c[0]?.avatar_url ?? null,
      isMember: ms.isMember,
      tierName: ms.isMember ? ms.tierName : null
    };
    // 我的报名（未取消）：最近一场还没结束的；没有的话看最近 7 天内结束的
    const { rows: mine } = await pool.query<EvRow & { reg_id: string; reg_status: string; arrival_status: string }>(
      `SELECT e.*, r.id AS reg_id, r.status AS reg_status, r.arrival_status,
              (SELECT count(*)::int FROM registrations x WHERE x.event_id = e.id AND x.status = 'registered') AS registered
         FROM registrations r JOIN events e ON e.id = r.event_id
        WHERE r.contact_id = $1 AND r.status <> 'cancelled' AND e.event_status <> 'cancelled'
          AND coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '7 days'
        ORDER BY (coalesce(e.ends_at, e.starts_at + interval '3 hours') > now()) DESC, e.starts_at ASC LIMIT 1`,
      [contactId]
    );
    const m0 = mine[0];
    // 1.2 线上问题 P-2/P-4：我报的那场已结束、但有未结束的活动时，首页大卡片和“邀请好友”都指向最近一场未结束的活动
    const m0Over = m0 ? (m0.ends_at ?? new Date(new Date(m0.starts_at).getTime() + 3 * 3600_000)).getTime() <= now.getTime() || m0.event_status === 'completed' : false;
    const m = m0 && !(m0Over && upcoming.length) ? m0 : undefined;
    if (m) {
      const end = m.ends_at ?? new Date(new Date(m.starts_at).getTime() + 3 * 3600_000);
      const ended = end.getTime() <= now.getTime() || m.event_status === 'completed';
      const today = !ended && dayKey(new Date(m.starts_at)) === dayKey(now);
      const phase: HomePhase = ended ? 'ended' : today ? 'today' : 'registered';
      status = {
        phase,
        event: evCard(m),
        registration: { id: m.reg_id, status: m.reg_status, arrival: m.arrival_status },
        checkinQr: !ended && m.reg_status === 'registered' && opts.withQr !== false ? await personalCheckinQr(opts.base, m.reg_id) : null,
        albumPublished: !!m.album_published_at
      };
    }
    albums = await unseenAlbums(contactId);
  }

  return {
    me,
    status,
    upcoming: upcoming.map(evCard),
    lastEvent,
    albums,
    wechatQr: (await getSetting<string>(pool, 'wechat_qr_url', '')) || null,
    channelsId: (await getSetting<string>(pool, 'channels_finder_id', '')) || null
  };
}
