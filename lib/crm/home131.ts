/**
 * 1.3.1 G：首页重做（小程序 1.3.1 用；线上 1.3.0 不受影响）。布局稳定、内容更新、下一步明确。
 * 所有内容只来自后台数据——没有活动时是品牌态（轮播只放“加入商会”和商会介绍），不出现任何示例活动。
 *
 * - 轮播（G3）：最多 5 张，按类型配额：活动最多 2、现场照片 / 精彩回顾 1、加入商会 / 会员服务 1、公告 / 合作伙伴 1；没有就不凑；
 *   同一场活动不重复。顺序：本人已报名且临近 → 当前地区 → 全国性 → 照片 / 回顾 → 入会（非会员）或会员专属（会员）→ 公告。
 *   照片卡：活动进行中“现场照片”，结束后 7 天内“精彩回顾”，7 天后撤出（相册和链接保留）。
 *   后台“首页轮播”的手动设置（置顶 / 隐藏 / 改 / 加）都有截止时间；活动取消 / 结束等状态优先于手动设置。
 * - 待办卡（G2）：首页唯一随人变的地方。优先级固定：需要确认出席 → 今天的活动 → 已报名活动 → 本场照片更新 → 一般推荐。
 *   轮播和待办卡不重复说同一件事。
 * - 近期活动（当前地区）、外地活动公告（不推送）、现场与回顾照片墙（只显示已发布）、会员企业（按展示审核）、知识与工具。
 * 小程序里不出现金额、付款字样和“已报 N 人”。
 */
import { getPool } from '@/lib/db/client';
import { memberStatus } from '@/lib/crm/membership';
import { seatStatus } from '@/lib/crm/seats';
import { DEFAULT_REGION, REGIONS, isRegion, regionOf, tzLabel } from '@/lib/crm/regions';
import { unseenAlbums } from '@/lib/crm/photos';
import { getSetting } from '@/lib/crm/orders';

type Db = ReturnType<typeof getPool>;
export type Persona = 'new' | 'registered' | 'member';
export type Slide = {
  key: string; // 去重 / 后台设置用：event:<id> / photos:<eventId> / join / member / intro / manual:<id>
  kind: 'event' | 'photos' | 'join' | 'member' | 'notice' | 'intro';
  eyebrow: string;
  title: string;
  meta: string;
  image: string | null;
  button: { text: string; page: string } | null;
  pinned?: boolean;
};

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://sinoamericanrec.org').replace(/\/$/, '');
const img = (path: string, w = 750) => `${SITE()}/_next/image?url=${encodeURIComponent(path)}&w=${w}&q=70`;

/** 默认图库（没传封面时按活动类型选；都是商会网站上已有的城市 / 建筑 / 会场图） */
export const DEFAULT_COVERS: Record<string, string[]> = {
  // 只用 jpg / png（海报生成器不认 webp）
  lecture: ['/images/la/la-skyline-marquee.jpg', '/images/home/los-angeles-hero.jpg', '/images/events/business-project-meeting.jpg', '/images/artgrid/services-hero-la-city.jpg', '/images/artgrid/la-city-02.jpg'],
  face: ['/images/events/business-handshake-meeting.jpg', '/images/events/business-project-meeting.jpg', '/images/projects/4136-rosewood-rendering.png', '/images/artgrid/la-city-02.jpg', '/images/la/la-skyline-marquee.jpg'],
  summit: ['/images/home/los-angeles-hero.jpg', '/images/la/la-skyline-marquee.jpg', '/images/artgrid/services-hero-la-city.jpg', '/images/artgrid/la-city-02.jpg', '/images/events/business-project-meeting.jpg'],
  other: ['/images/la/la-skyline-marquee.jpg', '/images/events/business-project-meeting.jpg', '/images/artgrid/la-city-02.jpg', '/images/projects/4136-rosewood-rendering.png', '/images/home/los-angeles-hero.jpg']
};
export function defaultCover(type: string | null | undefined, id: string): string {
  const list = DEFAULT_COVERS[type && DEFAULT_COVERS[type] ? type : 'other'];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
const coverOf = (e: { cover_url: string | null; template_key?: string | null; id: string }) =>
  e.cover_url ? (e.cover_url.startsWith('http') ? e.cover_url : img(e.cover_url)) : img(defaultCover(e.template_key, e.id));

const TYPE_NOUN: Record<string, string> = { lecture: '讲座', face: '圆桌', summit: '论坛' };
const noun = (k: string | null | undefined) => TYPE_NOUN[k ?? ''] ?? '活动';

function parts(d: Date, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false, weekday: 'short' }).formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: p.minute, wd: p.weekday as string };
}
const WD: Record<string, string> = { Sun: '日', Mon: '一', Tue: '二', Wed: '三', Thu: '四', Fri: '五', Sat: '六' };
/** “下午 2:00” / “晚 6:30” */
export function clock(d: Date, tz: string) {
  const p = parts(d, tz);
  const h12 = p.h % 12 || 12;
  const seg = p.h < 6 ? '凌晨' : p.h < 12 ? '上午' : p.h < 18 ? '下午' : '晚';
  return `${seg} ${h12}:${p.min}`;
}
/** “今天” / “明天” / “M 月 D 日 周X” */
export function dayWord(d: Date, tz: string, now = new Date()) {
  const a = parts(d, tz);
  const b = parts(now, tz);
  const da = Date.UTC(a.y, a.m - 1, a.d);
  const db = Date.UTC(b.y, b.m - 1, b.d);
  const diff = Math.round((da - db) / 86400_000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  return `${a.m} 月 ${a.d} 日 周${WD[a.wd] ?? ''}`;
}
/** “M 月 D 日 周X”（海报等不用“今天 / 明天”的地方） */
export function fullDate(d: Date, tz: string) {
  const p = parts(d, tz);
  return `${p.m} 月 ${p.d} 日 周${WD[p.wd] ?? ''}`;
}
const md = (d: Date, tz: string) => { const p = parts(d, tz); return { month: `${p.m} 月`, day: String(p.d) }; };

type Ev = {
  id: string; slug: string; title: string; summary: string | null; starts_at: Date; ends_at: Date | null; timezone: string; location_name: string | null;
  capacity: number | null; registered: number; cover_url: string | null; region: string; notify_scope: string; template_key: string | null;
  registration_open: boolean; event_status: string; album_published_at: Date | null;
};

async function upcomingEvents(db: Db): Promise<Ev[]> {
  const { rows } = await db.query<Ev>(
    `SELECT e.id, e.slug, e.title, e.summary, e.starts_at, e.ends_at, e.timezone, e.location_name, e.capacity, e.cover_url, e.region, e.notify_scope,
            e.registration_open, e.event_status, e.album_published_at,
            (SELECT p.template_key FROM event_prep p WHERE p.event_id = e.id LIMIT 1) AS template_key,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND (r.status = 'registered' OR (r.status = 'waitlisted' AND r.confirm_status = 'offered' AND r.offer_expires_at > now()))) AS registered
       FROM events e
      WHERE e.is_listed AND e.event_status = 'scheduled' AND coalesce(e.ends_at, e.starts_at + interval '3 hours') > now()
      ORDER BY e.starts_at LIMIT 30`
  );
  return rows;
}

function eventLine(e: Ev, mine = false) {
  const tz = e.timezone || 'America/Los_Angeles';
  const seat = seatStatus(e.capacity, e.registered);
  return [e.location_name, clock(e.starts_at, tz), mine || seat.key === 'open' ? null : seat.label].filter(Boolean).join(' · ');
}
const isRoundtable = (e: Ev) => e.template_key === 'face';

function eventSlide(e: Ev, mine: boolean): Slide {
  const tz = e.timezone || 'America/Los_Angeles';
  return {
    key: `event:${e.id}`,
    kind: 'event',
    eyebrow: `${mine ? '我报名的' + noun(e.template_key) : '下一场' + (e.template_key === 'lecture' ? '公开讲座' : noun(e.template_key))} · ${dayWord(e.starts_at, tz)}`,
    title: e.title,
    meta: eventLine(e, mine),
    image: coverOf(e),
    button: { text: mine ? '查看安排' : e.registration_open ? (isRoundtable(e) ? '申请席位' : '立即报名') : '查看详情', page: `/pages/event/event?slug=${encodeURIComponent(e.slug)}` }
  };
}

/** 首页数据（1.3.1） */
export async function home131(contactId: string | null, opts: { region?: string | null; persona?: Persona; now?: Date; simulateRegistered?: boolean } = {}) {
  const db = getPool();
  const now = opts.now ?? new Date();
  const ms = contactId ? await memberStatus(db, contactId) : { isMember: false };
  const reg = await regionOf(contactId);
  const region = isRegion(opts.region) ? opts.region : reg.region;

  // 本人报名（未取消、未结束）
  type Mine = Ev & { reg_id: string; reg_status: string; confirm_status: string; offer_expires_at: Date | null; arrival_status: string };
  const mine: Mine[] = contactId
    ? (await db.query<Mine>(
        `SELECT e.id, e.slug, e.title, e.summary, e.starts_at, e.ends_at, e.timezone, e.location_name, e.capacity, e.cover_url, e.region, e.notify_scope,
                e.registration_open, e.event_status, e.album_published_at, 0 AS registered,
                (SELECT p.template_key FROM event_prep p WHERE p.event_id = e.id LIMIT 1) AS template_key,
                r.id AS reg_id, r.status AS reg_status, r.confirm_status, r.offer_expires_at, r.arrival_status
           FROM registrations r JOIN events e ON e.id = r.event_id
          WHERE r.contact_id = $1 AND r.status <> 'cancelled' AND e.event_status = 'scheduled' AND coalesce(e.ends_at, e.starts_at + interval '3 hours') > now()
          ORDER BY e.starts_at`,
        [contactId]
      )).rows
    : [];
  const all0 = opts.simulateRegistered ? await upcomingEvents(db) : [];
  if (opts.simulateRegistered && all0[0]) mine.push({ ...all0[0], reg_id: 'preview', reg_status: 'registered', confirm_status: 'none', offer_expires_at: null, arrival_status: 'none' });
  const hasProfile = contactId
    ? !!(await db.query(`SELECT 1 FROM contacts WHERE id = $1 AND NULLIF(name, '微信用户') IS NOT NULL`, [contactId])).rows[0]
    : false;
  const persona: Persona = opts.persona ?? (ms.isMember ? 'member' : hasProfile || mine.length ? 'registered' : 'new');
  const isMember = persona === 'member';

  const all = await upcomingEvents(db);
  const local = all.filter((e) => e.region === region);
  const national = all.filter((e) => e.region !== region && e.notify_scope === 'all');
  const elsewhere = all.filter((e) => e.region !== region && e.notify_scope !== 'all');

  // ── 待办卡 ──
  let todo: Record<string, unknown>;
  let todoEventId: string | null = null;
  let todoPhotos: string | null = null;
  const askReg = mine.find((m) => (m.reg_status === 'registered' && m.confirm_status === 'asked') || (m.reg_status === 'waitlisted' && m.confirm_status === 'offered' && m.offer_expires_at && new Date(m.offer_expires_at) > now));
  const todayReg = mine.find((m) => m.reg_status === 'registered' && dayWord(m.starts_at, m.timezone, now) === '今天');
  const nextReg = mine.find((m) => m.reg_status !== 'cancelled');
  const albums = contactId ? await unseenAlbums(contactId) : [];
  if (askReg) {
    const tz = askReg.timezone || 'America/Los_Angeles';
    const offer = askReg.reg_status === 'waitlisted';
    const deadline = offer ? new Date(askReg.offer_expires_at!) : new Date(new Date(askReg.starts_at).getTime() - 21 * 3600_000);
    todo = {
      kind: 'confirm',
      title: offer ? `有名额了：${dayWord(askReg.starts_at, tz, now)}${clock(askReg.starts_at, tz).replace(' ', '')}的${noun(askReg.template_key)}` : `${dayWord(askReg.starts_at, tz, now)}${clock(askReg.starts_at, tz).replace(':00', ' 点').replace(' ', '')}的${noun(askReg.template_key)}，您来吗？`,
      sub: deadline.getTime() > now.getTime()
        ? `请在${dayWord(deadline, tz, now)} ${clock(deadline, tz)} 前确认，过时名额让给${offer ? '下一位' : '候补'}`
        : `请尽快确认，未确认的名额会让给${offer ? '下一位' : '候补'}`,
      regId: askReg.reg_id,
      slug: askReg.slug,
      actions: [{ text: '我来', action: 'confirm_yes' }, { text: '去不了', action: 'confirm_no' }]
    };
    todoEventId = askReg.id;
  } else if (todayReg) {
    const tz = todayReg.timezone || 'America/Los_Angeles';
    todo = {
      kind: 'today',
      title: `今天 ${clock(todayReg.starts_at, tz)} · ${todayReg.title}`,
      sub: todayReg.arrival_status === 'checked_in' ? '已签到，祝您愉快' : `${todayReg.location_name ?? '地点见活动页'} · 到场扫门口的码签到`,
      slug: todayReg.slug,
      actions: [{ text: todayReg.arrival_status === 'checked_in' ? '看安排' : '签到码', action: todayReg.arrival_status === 'checked_in' ? 'event' : 'checkin_qr' }]
    };
    todoEventId = todayReg.id;
  } else if (nextReg) {
    const tz = nextReg.timezone || 'America/Los_Angeles';
    todo = {
      kind: 'registered',
      title: `${nextReg.reg_status === 'waitlisted' ? '候补中' : '已报名'}：${nextReg.title}`,
      sub: `${dayWord(nextReg.starts_at, tz, now)} ${clock(nextReg.starts_at, tz)}${nextReg.region !== region ? ' · ' + nextReg.region : ''}（${tzLabel(tz)}）`,
      slug: nextReg.slug,
      actions: [{ text: '看安排', action: 'event' }]
    };
    todoEventId = nextReg.id;
  } else if (albums[0]) {
    todo = { kind: 'photos', title: `新增 ${albums[0].n} 张照片`, sub: `${albums[0].title} · 相册刚刚更新`, slug: albums[0].slug, actions: [{ text: '去看', action: 'album' }] };
    todoPhotos = albums[0].slug;
  } else if (persona === 'new') {
    todo = { kind: 'intro', title: '欢迎来到中美房地产商会', sub: '地产交流 · 专业分享 · 会员服务', actions: [{ text: '了解商会', action: 'intro' }] };
  } else if (local[0]) {
    const tz = local[0].timezone || 'America/Los_Angeles';
    todo = { kind: 'recommend', title: `推荐：${local[0].title}`, sub: `${dayWord(local[0].starts_at, tz, now)} ${clock(local[0].starts_at, tz)}`, slug: local[0].slug, actions: [{ text: '去看', action: 'event' }] };
  } else {
    todo = { kind: 'intro', title: '欢迎来到中美房地产商会', sub: '地产交流 · 专业分享 · 会员服务', actions: [{ text: '了解商会', action: 'intro' }] };
  }

  // ── 轮播 ──
  // 后台手动设置（都有截止时间；活动取消 / 结束优先于手动设置——已经不在自动列表里的活动置顶也不会出现）
  const { rows: ov } = await db.query<{ id: string; action: string; target: string | null; kind: Slide['kind']; title: string | null; eyebrow: string | null; meta: string | null; image_url: string | null; button_text: string | null; link: string | null; audience: string; region: string | null }>(
    `SELECT id, action, target, kind, title, eyebrow, meta, image_url, button_text, link, audience, region FROM home_slides
      WHERE removed_at IS NULL AND expires_at > now() ORDER BY created_at`
  ).catch(() => ({ rows: [] as never[] }));
  const applies = (o: { audience: string; region: string | null }) => (o.audience === 'all' || o.audience === persona || (o.audience === 'registered' && persona === 'member')) && (!o.region || o.region === region);
  const hidden = new Set(ov.filter(applies).filter((o) => o.action === 'hide').map((o) => o.target));
  const pinnedIds = new Set(ov.filter(applies).filter((o) => o.action === 'pin' && o.target?.startsWith('event:')).map((o) => o.target!.slice(6)));
  const slides: Slide[] = [];
  const seen = new Set<string>();
  const pushEv = (e: Ev, isMine: boolean) => {
    const k = `event:${e.id}`;
    if (seen.has(k) || hidden.has(k) || e.id === todoEventId || slides.filter((s) => s.kind === 'event').length >= 2) return;
    seen.add(k);
    slides.push(eventSlide(e, isMine));
  };
  // 测试 P2-G2：置顶的活动先排（不管它原本排第几）
  for (const e of all) if (pinnedIds.has(e.id)) pushEv(e, mine.some((m) => m.id === e.id));
  for (const m of mine) if (m.reg_status === 'registered' && new Date(m.starts_at).getTime() - now.getTime() < 14 * 86400_000) pushEv(m, true);
  for (const e of local) pushEv(e, false);
  for (const e of national) pushEv(e, false);
  // 照片 / 回顾：本场第一张允许公开的照片发布后生成；进行中“现场照片”，结束 7 天内“精彩回顾”
  const { rows: ph } = await db.query<{ id: string; slug: string; title: string; ended: boolean; thumb: string; n: number }>(
    `SELECT e.id, e.slug, e.title, coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now() AS ended,
            (SELECT p.url FROM event_photos p WHERE p.event_id = e.id AND NOT p.is_hidden AND coalesce(p.visibility, 'album') = 'album' AND p.variant_of IS NULL ORDER BY p.sort_order, p.created_at LIMIT 1) AS thumb,
            (SELECT count(*)::int FROM event_photos p WHERE p.event_id = e.id AND NOT p.is_hidden AND coalesce(p.visibility, 'album') = 'album' AND p.variant_of IS NULL) AS n
       FROM events e
      WHERE e.is_listed AND e.event_status <> 'cancelled' AND e.album_published_at IS NOT NULL
        AND e.starts_at <= now() AND coalesce(e.ends_at, e.starts_at + interval '3 hours') > now() - interval '7 days'
      ORDER BY e.starts_at DESC LIMIT 1`
  );
  if (ph[0]?.thumb && ph[0].n > 0 && ph[0].slug !== todoPhotos && !seen.has(`event:${ph[0].id}`) && !hidden.has(`photos:${ph[0].id}`)) {
    slides.push({
      key: `photos:${ph[0].id}`, kind: 'photos', eyebrow: ph[0].ended ? '精彩回顾' : '现场照片', title: ph[0].title, meta: `${ph[0].n} 张照片 · 可以转发给朋友`,
      image: ph[0].thumb, button: { text: '看照片', page: `/pages/album/album?slug=${encodeURIComponent(ph[0].slug)}` }
    });
  }
  // 入会（非会员）/ 会员专属（会员）
  slides.push(isMember
    ? { key: 'member', kind: 'member', eyebrow: 'SAREC 会员', title: '我的会员卡与会员权益', meta: '活动优先、资源对接、名片夹', image: img('/images/home/los-angeles-hero.jpg'), button: { text: '我的会员卡', page: '/pages/me/me' } }
    : { key: 'join', kind: 'join', eyebrow: '加入商会', title: '成为 SAREC 会员', meta: '地产交流 · 专业分享 · 会员服务', image: img('/images/home/los-angeles-hero.jpg'), button: { text: '了解入会', page: '/pages/join/join?from=home' } });
  // 没有任何活动：品牌态（轮播只放“加入商会”和商会介绍）
  const noEvents = !slides.some((s) => s.kind === 'event' || s.kind === 'photos');
  if (noEvents) {
    slides.push({ key: 'intro', kind: 'intro', eyebrow: 'SINO-AMERICAN REAL ESTATE CHAMBER', title: '中美房地产商会', meta: '连接中美资本，重构房地产项目协作', image: img('/images/la/la-skyline-marquee.jpg'), button: { text: '了解商会', page: '/pages/intro/intro' } });
  }

  let out = slides;
  for (const o of ov.filter(applies)) {
    if (o.action === 'hide') out = out.filter((s) => s.key !== o.target);
    if (o.action === 'edit' || o.action === 'pin') {
      out = out.map((s) => s.key !== o.target ? s : {
        ...s,
        title: o.title || s.title, eyebrow: o.eyebrow || s.eyebrow, meta: o.meta || s.meta, image: o.image_url || s.image,
        button: s.button ? { text: o.button_text || s.button.text, page: s.button.page } : s.button,
        pinned: o.action === 'pin' || s.pinned
      });
    }
    if (o.action === 'add' && !noEvents && out.filter((s) => s.kind === 'notice').length < 1) {
      out.push({ key: `manual:${o.id}`, kind: 'notice', eyebrow: o.eyebrow || '公告', title: o.title || '', meta: o.meta || '', image: o.image_url, button: o.link ? { text: o.button_text || '查看', page: o.link } : null });
    }
  }
  out = [...out.filter((s) => s.pinned), ...out.filter((s) => !s.pinned)].slice(0, 5);

  // ── 近期活动（当前地区；全国性也放进来）、外地公告 ──
  const cards = [...local, ...national].filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i).slice(0, 6).map((e) => {
    const tz = e.timezone || 'America/Los_Angeles';
    const m = mine.find((x) => x.id === e.id);
    const seat = seatStatus(e.capacity, e.registered);
    return {
      slug: e.slug, title: e.title, ...md(e.starts_at, tz), cover: coverOf(e),
      seat: seat.key === 'open' ? null : seat.label, full: seat.key === 'full',
      line: [isRoundtable(e) ? '闭门交流' : null, `${dayWord(e.starts_at, tz, now)} ${clock(e.starts_at, tz)}`].filter(Boolean).join(' · '),
      tz: tzLabel(tz),
      button: m ? (m.reg_status === 'waitlisted' ? '候补中' : '已报名') : e.registration_open ? (isRoundtable(e) ? '申请席位' : seat.key === 'full' ? '排候补' : '报名') : '查看'
    };
  });
  const away = elsewhere.slice(0, 5).map((e) => {
    const p = parts(e.starts_at, e.timezone || 'America/Los_Angeles');
    return { slug: e.slug, line: `${e.region} · ${p.m} 月 ${p.d} 日 · ${e.title}` };
  });

  // ── 现场与回顾（只显示已发布的照片） ──
  const { rows: wall } = await db.query<{ thumb: string; slug: string; title: string }>(
    `SELECT p.thumb_url AS thumb, e.slug, e.title FROM event_photos p JOIN events e ON e.id = p.event_id
      WHERE e.album_published_at IS NOT NULL AND e.is_listed AND NOT p.is_hidden AND coalesce(p.visibility, 'album') = 'album' AND p.variant_of IS NULL
      ORDER BY e.starts_at DESC, p.sort_order, p.created_at LIMIT 9`
  ).catch(() => ({ rows: [] as { thumb: string; slug: string; title: string }[] }));

  // ── 会员企业与合作伙伴（展示审核通过、会籍有效） ──
  const { rows: partners } = await db.query<{ name: string; logo: string | null }>(
    `SELECT DISTINCT ON (coalesce(company_name, contact_name)) coalesce(company_name, contact_name) AS name, logo_url AS logo
       FROM applications
      WHERE display_status = 'published' AND is_approved_for_display AND application_status IN ('approved','paid','second_payment_due')
        AND (membership_end_date IS NULL OR membership_end_date >= current_date)
      ORDER BY coalesce(company_name, contact_name), is_leadership_member DESC, is_featured DESC LIMIT 8`
  ).catch(() => ({ rows: [] as { name: string; logo: string | null }[] }));

  // ── 知识与工具 ──
  const { contentResearchList } = await import('@/lib/mpContent');
  const briefs = contentResearchList().items.slice(0, 4).map((c) => ({ title: c.title, sub: (c as { summary?: string }).summary ?? '', image: (c as { image?: string }).image ?? null, page: `/pages/article/article?slug=${encodeURIComponent((c as { slug: string }).slug)}` }));
  // 讲座回顾：已发布相册的活动（不放自动生成的回顾文字，小程序里不出现 AI 生成内容）
  const { rows: lectures } = await db.query<{ slug: string; title: string; starts_at: Date; timezone: string; n: number; thumb: string | null }>(
    `SELECT e.slug, e.title, e.starts_at, e.timezone,
            (SELECT count(*)::int FROM event_photos p WHERE p.event_id = e.id AND NOT p.is_hidden AND coalesce(p.visibility, 'album') = 'album' AND p.variant_of IS NULL) AS n,
            (SELECT p.thumb_url FROM event_photos p WHERE p.event_id = e.id AND NOT p.is_hidden ORDER BY p.sort_order LIMIT 1) AS thumb
       FROM events e WHERE e.is_listed AND e.album_published_at IS NOT NULL ORDER BY e.starts_at DESC LIMIT 4`
  ).catch(() => ({ rows: [] as never[] }));
  const toolsLive = !!(await getSetting<boolean>(db, 'web_tools_live', false));
  const tools = toolsLive
    ? [
        { title: '月供与现金流计算器', sub: '在浏览器打开，输入房价、利率、租金直接算', url: `${SITE()}/zh/tools/mortgage` },
        { title: '1031 换房税务速算', sub: '在浏览器打开，粗算应税和递延额（以会计师为准）', url: `${SITE()}/zh/tools/1031` }
      ]
    : [];

  return {
    region: { current: region, source: isRegion(opts.region) ? 'picked' : reg.source, options: REGIONS, default: DEFAULT_REGION },
    persona,
    isMember,
    todo,
    carousel: out,
    upcoming: cards,
    elsewhere: away,
    photos: wall.map((w) => ({ thumb: w.thumb, slug: w.slug, title: w.title })),
    partners: partners.map((p) => ({ name: p.name, logo: p.logo })),
    knowledge: {
      lectures: lectures.map((l) => ({ title: l.title, sub: `${parts(l.starts_at, l.timezone || 'America/Los_Angeles').m}/${parts(l.starts_at, l.timezone || 'America/Los_Angeles').d} · ${l.n} 张照片`, image: l.thumb, page: `/pages/album/album?slug=${encodeURIComponent(l.slug)}` })),
      briefs,
      tools
    }
  };
}

/** 后台“首页轮播”下拉：所有可以置顶 / 隐藏 / 改的卡（不只当前预览里的） */
export async function slideCandidates() {
  const evs = await upcomingEvents(getPool());
  return [
    ...evs.map((e) => ({ key: `event:${e.id}`, title: e.title, eyebrow: `活动 · ${e.region}` })),
    { key: 'join', title: '成为 SAREC 会员', eyebrow: '加入商会（非会员看到）' },
    { key: 'member', title: '我的会员卡与会员权益', eyebrow: '会员服务（会员看到）' },
    { key: 'intro', title: '中美房地产商会', eyebrow: '商会介绍（没有活动时）' }
  ];
}

/** 后台“首页轮播”：三种人分别看到什么（预览） */
export async function previewCarousel(region?: string) {
  return {
    new: (await home131(null, { region, persona: 'new' })).carousel,
    member: (await home131(null, { region, persona: 'member' })).carousel,
    registered: (await home131(null, { region, persona: 'registered', simulateRegistered: true })).carousel
  };
}
