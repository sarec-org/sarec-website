/**
 * 指令 95「商会看板」（服务器这一半）：首页一行滚动消息 + 「全部」看板页。文字全由服务器拼，小程序只显示，以后加新种类不发版。
 * ------------------------------------------------------------------
 * 消息两种来源：
 * 1. 工作人员手动发的通知（0055 board_notices）：一句话（≤ 60 字）＋可选链接（活动 / 小程序页面 / 网址），可置顶、可设显示到哪天。
 *    - 置顶的单独放 pinned，并永远排在 ticker 最前；不置顶的按发出时间进「按天」列表。
 *    - ends_at 过了就不出现（查询时过滤，不用定时任务）；removed_at 不为空 = 立即撤下。
 * 2. 自动消息（每种一个开关，crm_settings.board_auto；没有这条 / 没写到的种类 = 开）——全部从现有表实时算，**只取已公开 / 已过检测的东西**：
 *    event_new    新活动开始报名：商会活动 is_listed、scheduled、开着报名、还没开始，14 天内新建的
 *    seats_low    名额快满：上面这类活动里有名额上限、还剩 1 个到 20% 的（剩几个按"已报名 + 递补确认中"算）；文字只说「名额所剩不多」，不写数字
 *    meetup_short 组局还差几位：俱乐部组局 open + 已过微信内容检测（sec_status = ok）、14 天内开始、还没满、俱乐部已成立且没关闭；
 *                 文字由服务器按"哪天 + 上午/下午/晚上 + 俱乐部名 + 局"拼，不用用户自己写的标题
 *    member_new   新入会：最近 7 天成为会员的人数；写名字（公司名，没有就人名）的只用已同意「官网展示」的（display_status = published 且审核通过）
 *    jobs_new     找工人新发的活：公开列表里能看到的（open、没过期、微信检测 pass、不是小程序交来的），文字 = 城市 · 找 + 工种名（不用发布人写的字）；找工人总开关关了就不出
 *    festival     节日祝福：节日表里离今天 ≤ 提前天数（默认 2）的节日、且这个节日有上架的祝福图
 *    photos       活动相册新照片：公开照片（没隐藏、在相册里、审核通过、不是变体），按"哪场活动 + 哪天传的"算张数
 *    article      研究与动态新文章：小程序能看到的文章里 14 天内发布的
 *    poster_new   新海报模板上架：上架的模板按"分类 + 哪天上架"合并成「新上 N 张××海报 / 祝福图」
 * 同一天同一种 ≥ 3 条合成一条（「3 场新活动开始报名」），点了去对应的列表页。
 * 每种自动消息单独 try/catch：某张表还没有 / 查询出错，只少这一种，不影响整个看板。
 *
 * 时间都按洛杉矶算（"今天 / 昨天 / 11/24"）。公开接口结果在本实例内存缓存 30 秒（再加 CDN 30 秒）；后台一改就清本实例缓存。
 */
import { createHash } from 'node:crypto';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { getSetting, setSetting } from '@/lib/crm/orders';
import { audit } from '@/lib/crm/staff';
import type { Staff } from '@/lib/crm/auth';
import { laToday, laWallToIso } from '@/lib/laDate';
import { festivalsAt, parseDay } from '@/lib/org/festivals';
import { bannedWord } from '@/lib/org/texts';
import { findForbiddenWords } from '@/lib/compliance/forbiddenWords';
import { msgSecCheck } from '@/lib/crm/contentSec';

const TZ = 'America/Los_Angeles';
export const SETTINGS_KEY = 'board_auto';
export const TEXT_MAX = 60;
const DAYS = 14;
const TICKER_MAX = 8;
const MERGE_AT = 3;

export type Kind = 'notice' | 'event_new' | 'seats_low' | 'meetup_short' | 'member_new' | 'jobs_new' | 'festival' | 'photos' | 'article' | 'poster_new';
export type AutoKind = Exclude<Kind, 'notice'>;
/** 小程序端：string = 小程序页面路径（navigateTo）；{ web } = 网址；null = 不跳 */
export type Link = string | { web: string } | null;
export type BoardItem = { id: string; kind: Kind; icon: string; color: string; text: string; link: Link; time: string };
export type PinnedItem = BoardItem & { sub: string; endsAt: string | null };
export type BoardDay = { date: string; label: string; items: BoardItem[] };
export type Board = { ticker: BoardItem[]; pinned: PinnedItem[]; days: BoardDay[]; version: string; today: string };

/** 每种消息：名字（后台开关用）、说明、图标 key、颜色（小程序不认识的新图标就用颜色画个圆点，不用发版） */
export const KINDS: Record<Kind, { label: string; desc: string; icon: string; color: string }> = {
  notice: { label: '工作人员通知', desc: '后台 / 手机工作台手动发的', icon: 'notice', color: '#234A3E' },
  event_new: { label: '新活动开始报名', desc: '「12/5 周五分享会 开始报名」——商会活动公开且开着报名，14 天内新建的', icon: 'event', color: '#2257B8' },
  seats_low: { label: '名额快满', desc: '「商会月会 名额所剩不多」——还剩 20% 以内（至少 1 个）时；不写数字（小程序不显示人数）', icon: 'seats', color: '#C97A1E' },
  meetup_short: { label: '组局还差几位', desc: '「周六下午掼蛋局 还差 3 位」——已过内容检测、14 天内开始、还没满的俱乐部组局', icon: 'meetup', color: '#B07D2B' },
  member_new: { label: '新入会', desc: '「本周新加入 3 位会员 · 欢迎 ××公司 加入」——只写已同意官网展示的名字，其余只计数', icon: 'member', color: '#0E7A6B' },
  jobs_new: { label: '找工人新发的活', desc: '「尔湾 · 找水电」——公开列表里能看到的活儿，只写城市和工种', icon: 'jobs', color: '#7A5A3C' },
  festival: { label: '节日祝福', desc: '「后天感恩节，发一张祝福」——节日前 2 天起（按节日表），这个节日有祝福图时', icon: 'festival', color: '#C9403F' },
  photos: { label: '活动相册新照片', desc: '「11/21 讲座 照片上传了 36 张」——公开的照片', icon: 'photos', color: '#5C5BA0' },
  article: { label: '研究与动态新文章', desc: '「新文章：×××」——小程序能看到的文章，14 天内发布的', icon: 'article', color: '#3D5A8A' },
  poster_new: { label: '新海报模板上架', desc: '「新上 30 张圣诞海报」——按分类、按天合并', icon: 'poster', color: '#0E7A6B' }
};
export const AUTO_KINDS = (Object.keys(KINDS) as Kind[]).filter((k): k is AutoKind => k !== 'notice');

/** 发通知「选页面」能选的小程序页面（都是不带参数就能打开的） */
export const PAGES: { path: string; label: string }[] = [
  { path: '/pages/events/events', label: '活动列表' },
  { path: '/pages/greeting/greeting', label: '节日祝福' },
  { path: '/pages/join/join', label: '加入商会' },
  { path: '/pages/committees/committees', label: '专委会与俱乐部' },
  { path: '/pages/research/research', label: '研究与动态' },
  { path: '/pages/albums/albums', label: '活动相册' },
  { path: '/pages/jobs/trades', label: '找工人 / 施工队' },
  { path: '/pages/showcase/showcase', label: '商会风采' },
  { path: '/pages/intro/intro', label: '商会介绍' },
  { path: '/pages/contactus/contactus', label: '联系我们' },
  { path: '/pages/me/me', label: '我的' }
];

// ── 小工具 ────────────────────────────────────────────────────────────
const WD = ['日', '一', '二', '三', '四', '五', '六'];
function parts(d: Date, tz = TZ) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', weekday: 'short' })
      .formatToParts(d).map((x) => [x.type, x.value])
  );
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, wd };
}
const md = (d: Date, tz = TZ) => { const p = parts(d, tz); return `${p.m}/${p.d}`; };
const dayNo = (s: string) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000);
const addDays = (s: string, n: number) => new Date((dayNo(s) + n) * 86400000).toISOString().slice(0, 10);
const cut = (s: string, n: number) => (Array.from(s).length > n ? Array.from(s).slice(0, n - 1).join('') + '…' : s);
const iso = (d: Date | string) => new Date(d).toISOString();
const q = (s: string) => encodeURIComponent(s);

type Raw = { id: string; kind: AutoKind | 'notice'; text: string; link: Link; time: string };
const item = (r: Raw): BoardItem => ({ id: r.id, kind: r.kind, icon: KINDS[r.kind].icon, color: KINDS[r.kind].color, text: r.text, link: r.link, time: r.time });

/** 开关：crm_settings.board_auto；没有这条 / 没写到的种类 = 开 */
export async function boardSwitches(): Promise<Record<AutoKind, boolean>> {
  const v = await getSetting<Record<string, unknown>>(getPool(), SETTINGS_KEY, {});
  const o = v && typeof v === 'object' ? v : {};
  return Object.fromEntries(AUTO_KINDS.map((k) => [k, o[k] !== false])) as Record<AutoKind, boolean>;
}

// ── 自动消息：每种一个函数，返回原始条目（还没合并） ─────────────────────
type Ctx = { now: Date; today: string; since: Date };

async function eventNew(c: Ctx): Promise<Raw[]> {
  const { rows } = await getPool().query<{ id: string; slug: string; title: string; starts_at: Date; timezone: string | null; created_at: Date }>(
    `SELECT id, slug, title, starts_at, timezone, created_at FROM events
      WHERE is_listed AND event_status = 'scheduled' AND registration_open AND starts_at > now() AND created_at >= $1
      ORDER BY created_at DESC LIMIT 30`,
    [c.since]
  );
  return rows.map((e) => ({
    id: `event_new:${e.id}`, kind: 'event_new', time: iso(e.created_at),
    text: `${md(e.starts_at, e.timezone || TZ)} ${cut(e.title, 18)} 开始报名`,
    link: `/pages/event/event?slug=${q(e.slug)}`
  }));
}

async function seatsLow(c: Ctx): Promise<Raw[]> {
  const { rows } = await getPool().query<{ id: string; slug: string; title: string; capacity: number; taken: number }>(
    `SELECT e.id, e.slug, e.title, e.capacity,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id
               AND (r.status = 'registered' OR (r.status = 'waitlisted' AND r.confirm_status = 'offered' AND r.offer_expires_at > now()))) AS taken
       FROM events e
      WHERE e.is_listed AND e.event_status = 'scheduled' AND e.registration_open AND e.starts_at > now() AND e.capacity > 0
      ORDER BY e.starts_at LIMIT 30`
  );
  return rows
    .filter((e) => { const left = e.capacity - e.taken; return left > 0 && left <= e.capacity * 0.2; })
    .map((e) => ({
      id: `seats_low:${e.id}`, kind: 'seats_low', time: iso(c.now),
      // 1.3.1 起小程序不显示人数 / 剩几个，只说「所剩不多」
      text: `${cut(e.title, 18)} 名额所剩不多`,
      link: `/pages/event/event?slug=${q(e.slug)}`
    }));
}

async function meetupShort(c: Ctx): Promise<Raw[]> {
  const pool = getPool();
  const list = await getSetting<{ key: string; status: string }[]>(pool, 'committees', []);
  const active = new Set((Array.isArray(list) ? list : []).filter((x) => x.status === 'active').map((x) => x.key));
  const { rows } = await pool.query<{ id: string; starts_at: Date; capacity: number; joined: number; club_key: string; club_name: string }>(
    `SELECT u.id, u.starts_at, u.capacity, cl.key AS club_key, cl.name AS club_name,
            (SELECT count(*)::int FROM club_meetup_joins j WHERE j.meetup_id = u.id) AS joined
       FROM club_meetups u JOIN clubs cl ON cl.id = u.club_id
      WHERE u.status = 'open' AND u.sec_status = 'ok' AND cl.closed_at IS NULL
        AND u.starts_at > now() AND u.starts_at < now() + interval '14 days'
      ORDER BY u.starts_at LIMIT 30`
  );
  return rows
    .filter((u) => active.has(u.club_key) && u.joined < u.capacity)
    .map((u) => {
      const p = parts(u.starts_at);
      const diff = dayNo(laToday(u.starts_at)) - dayNo(c.today);
      const day = diff === 0 ? '今天' : diff === 1 ? '明天' : diff < 7 ? `周${WD[p.wd]}` : `${p.m}/${p.d} `;
      const period = p.h < 12 ? '上午' : p.h < 18 ? '下午' : '晚上';
      const club = u.club_name.replace(/俱乐部$/, '') || u.club_name;
      return {
        id: `meetup_short:${u.id}`, kind: 'meetup_short' as const, time: iso(c.now),
        text: `${day}${period}${club}局 还差 ${u.capacity - u.joined} 位`,
        link: `/pages/meetupinfo/meetupinfo?id=${u.id}`
      };
    });
}

async function memberNew(c: Ctx): Promise<Raw[]> {
  // 最近 7 天成为会员（第一次付款 / 会籍开始），一人一条；名字只取已同意官网展示的
  const { rows } = await getPool().query<{ at: Date; name: string | null; shown: boolean }>(
    `SELECT DISTINCT ON (coalesce(a.contact_id::text, a.id::text))
            coalesce(a.first_payment_paid_at, a.membership_start_date::timestamptz, a.created_at) AS at,
            NULLIF(trim(coalesce(NULLIF(trim(a.company_name), ''), a.contact_name)), '') AS name,
            (a.display_status = 'published' AND a.is_approved_for_display) AS shown
       FROM applications a
      WHERE (a.application_status IN ('approved','paid','second_payment_due')
             OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))
        AND (a.membership_end_date IS NULL OR a.membership_end_date >= current_date)
        AND coalesce(a.first_payment_paid_at, a.membership_start_date::timestamptz, a.created_at) >= now() - interval '7 days'
      ORDER BY coalesce(a.contact_id::text, a.id::text), at DESC`
  );
  if (!rows.length) return [];
  const names = Array.from(new Set(rows.filter((r) => r.shown && r.name).map((r) => cut(r.name!, 12)))).slice(0, 2);
  const latest = rows.reduce((m, r) => (new Date(r.at) > m ? new Date(r.at) : m), new Date(0));
  return [{
    id: `member_new:${laToday(latest)}`, kind: 'member_new', time: iso(latest),
    text: `本周新加入 ${rows.length} 位会员${names.length ? ` · 欢迎 ${names.join('、')} 加入` : ''}`,
    link: '/pages/join/join?from=board'
  }];
}

async function jobsNew(c: Ctx): Promise<Raw[]> {
  const pool = getPool();
  if ((await getSetting<unknown>(pool, 'jobs_find_on', true)) === false) return [];
  const { rows } = await pool.query<{ id: string; created_at: Date; trade: string | null; city: string | null; city_raw: string | null }>(
    `SELECT p.id, p.created_at, t.name AS trade, ci.name AS city, p.city AS city_raw
       FROM jobs_posts p
       LEFT JOIN jobs_trades t ON t.key = p.trade_key
       LEFT JOIN jobs_cities ci ON ci.key = p.city_key
      WHERE p.status = 'open' AND p.expires_at > now() AND p.sec_status = 'pass' AND coalesce(p.source, '') <> 'mp'
        AND p.created_at >= $1
      ORDER BY p.created_at DESC LIMIT 30`,
    [c.since]
  );
  return rows.filter((p) => p.trade).map((p) => ({
    id: `jobs_new:${p.id}`, kind: 'jobs_new', time: iso(p.created_at),
    text: `${p.city ? cut(p.city, 8) + ' · ' : ''}找${cut(p.trade!.replace(/（[^）]*）|\([^)]*\)/g, '').trim() || p.trade!, 10)}`,
    link: '/pages/jobs/mine'
  }));
}

async function festival(c: Ctx): Promise<Raw[]> {
  const pool = getPool();
  const fs = (await festivalsAt(c.today, pool)).filter((f) => f.greet_category_key && f.days != null && f.days <= f.show_before_days && f.days >= -f.show_until_offset);
  if (!fs.length) return [];
  const { rows } = await pool.query<{ k: string }>(
    `SELECT DISTINCT t.category_key AS k FROM poster_templates t JOIN poster_categories c ON c.key = t.category_key
      WHERE t.category_key = ANY($1::text[]) AND t.status = 'active' AND c.active AND t.purpose = 'greeting' AND c.purpose = 'greeting'`,
    [fs.map((f) => f.greet_category_key)]
  );
  const have = new Set(rows.map((r) => r.k));
  return fs.filter((f) => have.has(f.greet_category_key!)).map((f) => {
    const d = f.days!;
    const when = d === 2 ? `后天${f.name}` : d === 1 ? `明天${f.name}` : d === 0 ? `今天${f.name}` : d > 2 ? `${+f.date!.slice(5, 7)}/${+f.date!.slice(8, 10)} ${f.name}` : `${f.name}期间`;
    return {
      id: `festival:${f.key}:${f.date}`, kind: 'festival' as const, time: iso(c.now),
      text: `${when}，发一张祝福`,
      link: '/pages/greeting/greeting?from=board'
    };
  });
}

const PHOTO_OK = `NOT p.is_hidden AND coalesce(p.visibility, 'album') = 'album' AND p.variant_of IS NULL AND coalesce(p.review_status, 'ok') = 'ok'`;
async function photos(c: Ctx): Promise<Raw[]> {
  const { rows } = await getPool().query<{ id: string; slug: string; title: string; starts_at: Date; timezone: string | null; day: string; n: number; last: Date }>(
    `SELECT e.id, e.slug, e.title, e.starts_at, e.timezone,
            to_char(p.created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS day, count(*)::int AS n, max(p.created_at) AS last
       FROM event_photos p JOIN events e ON e.id = p.event_id
      WHERE e.is_listed AND e.event_status <> 'cancelled' AND ${PHOTO_OK} AND p.created_at >= $1
      GROUP BY e.id, day ORDER BY last DESC LIMIT 30`,
    [c.since]
  );
  return rows.map((r) => ({
    id: `photos:${r.id}:${r.day}`, kind: 'photos', time: iso(r.last),
    text: `${md(r.starts_at, r.timezone || TZ)} ${cut(r.title, 14)} 照片上传了 ${r.n} 张`,
    link: `/pages/album/album?slug=${q(r.slug)}`
  }));
}

async function article(c: Ctx): Promise<Raw[]> {
  const [{ contentResearchList, setContentVisibility }, vis] = await Promise.all([
    import('@/lib/mpContent'),
    getSetting<Record<string, unknown>>(getPool(), 'content_visibility', {})
  ]);
  setContentVisibility(vis as Parameters<typeof setContentVisibility>[0]);
  const from = addDays(c.today, -(DAYS - 1));
  return contentResearchList().items
    .map((a) => ({ a, day: typeof (a as { date?: unknown }).date === 'string' ? String((a as { date?: string }).date).slice(0, 10) : '' }))
    .filter(({ day }) => !!parseDay(day) && day >= from && day <= c.today)
    .slice(0, 20)
    .map(({ a, day }) => ({
      id: `article:${(a as { slug: string }).slug}`, kind: 'article' as const, time: laWallToIso(day, '09:00'),
      text: `新文章：${cut((a as { title: string }).title, 24)}`,
      link: `/pages/article/article?slug=${q((a as { slug: string }).slug)}`
    }));
}

async function posterNew(c: Ctx): Promise<Raw[]> {
  const { rows } = await getPool().query<{ key: string; name: string; purpose: string; day: string; n: number; last: Date }>(
    `SELECT c.key, c.name, t.purpose, to_char(t.created_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS day, count(*)::int AS n, max(t.created_at) AS last
       FROM poster_templates t JOIN poster_categories c ON c.key = t.category_key
      WHERE t.status = 'active' AND c.active AND t.purpose = c.purpose AND t.created_at >= $1
      GROUP BY c.key, c.name, t.purpose, day ORDER BY last DESC LIMIT 60`,
    [c.since]
  );
  return rows.map((r) => ({
    id: `poster_new:${r.key}:${r.day}`, kind: 'poster_new', time: iso(r.last),
    text: r.purpose === 'greeting' ? `新上 ${r.n} 张${cut(r.name, 8)}祝福图` : `新上 ${r.n} 张${cut(r.name, 8)}海报`,
    // 祝福图去「节日祝福」；活动海报去挑模板页（主办方出海报用的那一页）
    link: r.purpose === 'greeting' ? '/pages/greeting/greeting?from=board' : '/pages/org/tpl/tpl'
  }));
}

const AUTO: Record<AutoKind, (c: Ctx) => Promise<Raw[]>> = {
  event_new: eventNew, seats_low: seatsLow, meetup_short: meetupShort, member_new: memberNew, jobs_new: jobsNew,
  festival, photos, article, poster_new: posterNew
};

/** 同一天同一种 ≥ 3 条 → 合成一条（文字、去哪） */
const MERGE: Partial<Record<AutoKind, (rs: Raw[]) => { text: string; link: Link }>> = {
  event_new: (rs) => ({ text: `${rs.length} 场新活动开始报名`, link: '/pages/events/events' }),
  seats_low: (rs) => ({ text: `${rs.length} 场活动名额快满了`, link: '/pages/events/events' }),
  meetup_short: (rs) => ({ text: `${rs.length} 个组局还差人`, link: '/pages/committees/committees' }),
  jobs_new: (rs) => ({ text: `找工人：新发了 ${rs.length} 个活儿`, link: '/pages/jobs/mine' }),
  photos: (rs) => ({ text: `${rs.length} 场活动的照片更新了`, link: '/pages/albums/albums' }),
  article: (rs) => ({ text: `${rs.length} 篇新文章`, link: '/pages/research/research' }),
  poster_new: (rs) => {
    const n = rs.reduce((s, r) => s + (Number(/新上 (\d+) 张/.exec(r.text)?.[1]) || 0), 0);
    const allGreet = rs.every((r) => r.text.endsWith('祝福图'));
    return { text: `新上 ${n} 张${allGreet ? '祝福图' : '海报模板'}`, link: allGreet ? '/pages/greeting/greeting?from=board' : '/pages/org/tpl/tpl' };
  }
};

// ── 人工通知 ──────────────────────────────────────────────────────────
type NoticeRow = { id: string; text: string; link: Record<string, unknown> | null; pinned: boolean; starts_at: Date; ends_at: Date | null; created_by: string; created_at: Date; removed_at: Date | null };

/** 存的 link → 小程序用的 link（活动按编号现查 slug；活动已取消 / 不公开了就不跳） */
async function resolveLinks(rows: NoticeRow[]): Promise<Map<string, Link>> {
  const ids = rows.map((r) => (r.link?.type === 'event' ? String(r.link.id ?? '') : '')).filter((x) => /^[0-9a-f-]{36}$/.test(x));
  const slugs = new Map<string, string>();
  if (ids.length) {
    const { rows: ev } = await getPool().query<{ id: string; slug: string }>(
      `SELECT id, slug FROM events WHERE id = ANY($1::uuid[]) AND is_listed AND event_status <> 'cancelled'`,
      [ids]
    );
    for (const e of ev) slugs.set(e.id, e.slug);
  }
  return new Map(rows.map((r) => {
    const l = r.link;
    let out: Link = null;
    if (l?.type === 'event' && slugs.has(String(l.id))) out = `/pages/event/event?slug=${q(slugs.get(String(l.id))!)}`;
    else if (l?.type === 'page' && typeof l.path === 'string') out = l.path;
    else if (l?.type === 'web' && typeof l.url === 'string') out = { web: l.url };
    return [r.id, out];
  }));
}

async function liveNotices(): Promise<NoticeRow[]> {
  const { rows } = await getPool().query<NoticeRow>(
    `SELECT * FROM board_notices
      WHERE removed_at IS NULL AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
      ORDER BY pinned DESC, starts_at DESC LIMIT 50`
  );
  return rows;
}

const dayLabel = (today: string, day: string) => {
  const d = dayNo(today) - dayNo(day);
  return d === 0 ? '今天' : d === 1 ? '昨天' : `${+day.slice(5, 7)}/${+day.slice(8, 10)}`;
};

// ── 组装 ──────────────────────────────────────────────────────────────
/** 看板数据。today（洛杉矶日期）只影响节日那一种（测试用 ?today=）；其余按真实时间。 */
export async function buildBoard(opts: { today?: string; now?: Date } = {}): Promise<Board> {
  const now = opts.now ?? new Date();
  const realToday = laToday(now);
  const ctx: Ctx = { now, today: opts.today ?? realToday, since: new Date(laWallToIso(addDays(realToday, -(DAYS - 1)), '00:00')) };
  const sw = await boardSwitches();
  const [notices, ...autos] = await Promise.all([
    liveNotices().catch((e) => { console.warn('[board] notices', e instanceof Error ? e.message : e); return [] as NoticeRow[]; }),
    ...AUTO_KINDS.map((k) => (sw[k] ? AUTO[k](ctx).catch((e) => { console.warn('[board]', k, e instanceof Error ? e.message : e); return [] as Raw[]; }) : Promise.resolve([] as Raw[])))
  ]);
  const links = await resolveLinks(notices).catch(() => new Map<string, Link>());

  const pinned: PinnedItem[] = notices.filter((n) => n.pinned).map((n) => ({
    ...item({ id: `notice:${n.id}`, kind: 'notice', text: n.text, link: links.get(n.id) ?? null, time: iso(n.starts_at) }),
    sub: [`${md(n.starts_at)} 发`, n.ends_at ? `${md(new Date(new Date(n.ends_at).getTime() - 1000))} 撤下` : null].filter(Boolean).join(' · '),
    endsAt: n.ends_at ? iso(n.ends_at) : null
  }));

  const raws: Raw[] = [
    ...notices.filter((n) => !n.pinned).map((n) => ({ id: `notice:${n.id}`, kind: 'notice' as const, text: n.text, link: links.get(n.id) ?? null, time: iso(n.starts_at) })),
    ...autos.flat()
  ];
  // 按洛杉矶日期分天（最近 14 天），同天同种 ≥ 3 条合并
  const from = addDays(realToday, -(DAYS - 1));
  const byDay = new Map<string, Raw[]>();
  for (const r of raws) {
    const day = laToday(new Date(r.time));
    if (day < from || day > realToday) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  const days: BoardDay[] = Array.from(byDay.keys()).sort().reverse().map((day) => {
    const list = byDay.get(day)!;
    const out: Raw[] = [];
    const groups = new Map<string, Raw[]>();
    for (const r of list) groups.set(r.kind, [...(groups.get(r.kind) ?? []), r]);
    for (const [kind, rs] of Array.from(groups.entries())) {
      const m = kind !== 'notice' ? MERGE[kind as AutoKind] : undefined;
      if (m && rs.length >= MERGE_AT) {
        const last = rs.reduce((a, b) => (a.time > b.time ? a : b)).time;
        out.push({ id: `${kind}:merged:${day}`, kind: kind as AutoKind, time: last, ...m(rs) });
      } else out.push(...rs);
    }
    out.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
    return { date: day, label: dayLabel(realToday, day), items: out.map(item) };
  });

  const ticker = [...pinned.map(({ sub: _s, endsAt: _e, ...x }) => x), ...days.flatMap((d) => d.items)].slice(0, TICKER_MAX);
  const version = createHash('sha1').update(JSON.stringify({ ticker, pinned, days })).digest('hex').slice(0, 12);
  return { ticker, pinned, days, version, today: ctx.today };
}

const cache = new Map<string, { at: number; data: Board }>();
/** 公开接口用：本实例缓存 30 秒 */
export async function boardCached(today?: string): Promise<Board> {
  const key = today ?? '';
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 30_000) return hit.data;
  const data = await buildBoard({ today });
  cache.set(key, { at: Date.now(), data });
  return data;
}
export const clearBoardCache = () => cache.clear();

// ── 后台 / 手机工作台 ─────────────────────────────────────────────────
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PAGE_PATH = /^\/pages\/[a-z0-9_]+(\/[a-z0-9_]+){1,2}(\?[A-Za-z0-9_=&%.\-]*)?$/;

/** 通知文字：去掉换行和多余空格，1–60 字；禁用词、合规禁词、微信文本检测（用发通知的人自己的小程序 openid） */
export async function checkNoticeText(s: Staff, raw: unknown): Promise<string> {
  const text = (typeof raw === 'string' ? raw : '').replace(/\s+/g, ' ').trim();
  if (!text) throw new CrmError('bad_request', '请写一句话通知');
  if (Array.from(text).length > TEXT_MAX) throw new CrmError('bad_request', `通知最多 ${TEXT_MAX} 个字，现在 ${Array.from(text).length} 个，请删短一点`);
  const bad = bannedWord(text) ?? findForbiddenWords(text, 'universal')[0] ?? null;
  if (bad) throw new CrmError('bad_request', `通知里有不能用的字「${bad}」，请改一下`);
  const { rows } = await getPool().query<{ o: string | null }>(`SELECT wechat_openid AS o FROM contacts WHERE id = $1`, [s.contactId]);
  const o = rows[0]?.o ?? null;
  const r = await msgSecCheck(text, o && !o.startsWith('dev-openid-') ? o : null, 1);
  if (r === 'risky') throw new CrmError('bad_request', '通知没通过微信的内容检测，请改一下文字再发');
  return text;
}

/** 发通知时选的链接 → 存进库的样子（null = 不跳） */
export async function parseNoticeLink(v: unknown): Promise<Record<string, string> | null> {
  if (v == null || v === '') return null;
  const l = v as Record<string, unknown>;
  const type = String(l.type ?? '');
  if (type === '' || type === 'none') return null;
  if (type === 'event') {
    const id = String(l.id ?? '');
    if (!UUID.test(id)) throw new CrmError('bad_request', '请选一场活动');
    const { rows } = await getPool().query(`SELECT 1 FROM events WHERE id = $1 AND is_listed AND event_status <> 'cancelled'`, [id]);
    if (!rows.length) throw new CrmError('bad_request', '这场活动找不到，或者不公开 / 已取消');
    return { type, id };
  }
  if (type === 'page') {
    const path = String(l.path ?? '').trim();
    if (!PAGES.some((p) => p.path === path) && !PAGE_PATH.test(path)) throw new CrmError('bad_request', '请从列表里选一个页面');
    return { type, path };
  }
  if (type === 'web') {
    const url = String(l.url ?? '').trim();
    let u: URL | null = null;
    try { u = new URL(url); } catch { u = null; }
    if (!u || u.protocol !== 'https:' || url.length > 300) throw new CrmError('bad_request', '网址要以 https:// 开头（300 字以内）');
    return { type, url: u.toString() };
  }
  throw new CrmError('bad_request', '链接类型不对');
}

/** 「显示到哪天」（含这一天，洛杉矶时间）→ ends_at = 第二天 0 点；空 = 不自动撤 */
function endsAtOf(v: unknown): string | null {
  if (v == null || v === '') return null;
  const d = parseDay(v);
  if (!d) throw new CrmError('bad_request', '日期格式不对，请按 2026-12-12 这样写');
  if (d < laToday()) throw new CrmError('bad_request', '显示到哪天不能早于今天');
  return laWallToIso(addDays(d, 1), '00:00');
}

const noticeStatus = (n: NoticeRow, now = Date.now()) =>
  n.removed_at ? 'removed' : n.ends_at && new Date(n.ends_at).getTime() <= now ? 'expired' : new Date(n.starts_at).getTime() > now ? 'scheduled' : 'live';
const STATUS_LABEL: Record<string, string> = { live: '显示中', scheduled: '还没到开始时间', expired: '已到期自动撤下', removed: '已撤下' };

/** 后台页 / 手机工作台：通知列表、开关、现在首页滚的是哪几条、能选的活动和页面 */
export async function staffBoard() {
  const pool = getPool();
  const [{ rows: ns }, sw, board, { rows: evs }] = await Promise.all([
    pool.query<NoticeRow>(`SELECT * FROM board_notices ORDER BY (removed_at IS NULL AND (ends_at IS NULL OR ends_at > now())) DESC, pinned DESC, created_at DESC LIMIT 60`),
    boardSwitches(),
    buildBoard(),
    pool.query<{ id: string; title: string; starts_at: Date; timezone: string | null }>(
      `SELECT id, title, starts_at, timezone FROM events
        WHERE is_listed AND event_status <> 'cancelled' AND coalesce(ends_at, starts_at + interval '3 hours') > now() - interval '30 days'
        ORDER BY starts_at DESC LIMIT 40`
    )
  ]);
  const links = await resolveLinks(ns);
  const evName = new Map(evs.map((e) => [e.id, e.title]));
  const linkLabel = (n: NoticeRow) => {
    const l = n.link;
    if (!l) return '不跳转';
    if (l.type === 'event') return `活动：${evName.get(String(l.id)) ?? '（找不到 / 已不公开）'}`;
    if (l.type === 'page') return `页面：${PAGES.find((p) => p.path === l.path)?.label ?? l.path}`;
    if (l.type === 'web') return `网址：${l.url}`;
    return '—';
  };
  const counts: Record<string, number> = {};
  for (const d of board.days) for (const it of d.items) counts[it.kind] = (counts[it.kind] ?? 0) + 1;
  return {
    today: laToday(),
    textMax: TEXT_MAX,
    notices: ns.map((n) => ({
      id: n.id, text: n.text, link: n.link, linkTo: links.get(n.id) ?? null, linkLabel: linkLabel(n), pinned: n.pinned,
      startsAt: n.starts_at, endsAt: n.ends_at, endsOn: n.ends_at ? laToday(new Date(new Date(n.ends_at).getTime() - 1000)) : null,
      createdBy: n.created_by.replace(/^staff:/, ''), createdAt: n.created_at, removedAt: n.removed_at,
      status: noticeStatus(n), statusLabel: STATUS_LABEL[noticeStatus(n)]
    })),
    switches: AUTO_KINDS.map((k) => ({ kind: k, label: KINDS[k].label, desc: KINDS[k].desc, color: KINDS[k].color, on: sw[k], count: counts[k] ?? 0 })),
    preview: { ticker: board.ticker, pinned: board.pinned, dayCount: board.days.length, itemCount: board.days.reduce((s, d) => s + d.items.length, 0) },
    events: evs.map((e) => ({ id: e.id, title: e.title, date: md(e.starts_at, e.timezone || TZ) })),
    pages: PAGES
  };
}

/**
 * 后台动作（运营）：
 * - { action:'create', text, link?:{type:'event',id}|{type:'page',path}|{type:'web',url}, pinned?, endsOn?:'YYYY-MM-DD' }
 * - { action:'pin', id, pinned } / { action:'set_end', id, endsOn|null } / { action:'remove', id }
 * - { action:'switch', kind, on }
 * 全部记 crm_audit_log（board_notice_add / board_notice_pin / board_notice_end / board_notice_remove / board_auto）。
 */
export async function staffBoardAction(s: Staff, b: Record<string, unknown>) {
  const action = String(b.action ?? '');
  try {
    if (action === 'create') {
      const text = await checkNoticeText(s, b.text);
      const link = await parseNoticeLink(b.link);
      const endsAt = endsAtOf(b.endsOn);
      const pinned = b.pinned === true;
      return await withTransaction(async (db) => {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO board_notices (text, link, pinned, ends_at, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [text, link ? JSON.stringify(link) : null, pinned, endsAt, `staff:${s.name}`]
        );
        await audit(db, s, 'board_notice_add', 'board_notice', rows[0].id, { after: { text, link, pinned, endsAt } });
        return { id: rows[0].id, message: pinned ? '已发出并置顶，首页看板 1 分钟内能看到' : '已发出，首页看板 1 分钟内能看到' };
      });
    }
    if (action === 'switch') {
      const kind = String(b.kind ?? '') as AutoKind;
      if (!AUTO_KINDS.includes(kind)) throw new CrmError('bad_request', '没有这种自动消息');
      const on = b.on !== false;
      return await withTransaction(async (db) => {
        const cur = await getSetting<Record<string, unknown>>(db, SETTINGS_KEY, {});
        const next = { ...(cur && typeof cur === 'object' ? cur : {}), [kind]: on };
        await setSetting(db, SETTINGS_KEY, next, `staff:${s.name}`);
        await audit(db, s, 'board_auto', 'setting', SETTINGS_KEY, { before: cur, after: next });
        return { message: `「${KINDS[kind].label}」已${on ? '打开' : '关掉'}` };
      });
    }
    const id = String(b.id ?? '');
    if (!UUID.test(id)) throw new CrmError('bad_request', '请选一条通知');
    return await withTransaction(async (db) => {
      const { rows } = await db.query<NoticeRow>(`SELECT * FROM board_notices WHERE id = $1 FOR UPDATE`, [id]);
      const n = rows[0];
      if (!n) throw new CrmError('not_found', '找不到这条通知');
      if (action === 'pin') {
        const pinned = b.pinned === true;
        await db.query(`UPDATE board_notices SET pinned = $2 WHERE id = $1`, [id, pinned]);
        await audit(db, s, 'board_notice_pin', 'board_notice', id, { before: { pinned: n.pinned }, after: { pinned } });
        return { message: pinned ? '已置顶' : '已取消置顶' };
      }
      if (action === 'set_end') {
        const endsAt = endsAtOf(b.endsOn);
        await db.query(`UPDATE board_notices SET ends_at = $2 WHERE id = $1`, [id, endsAt]);
        await audit(db, s, 'board_notice_end', 'board_notice', id, { before: { endsAt: n.ends_at }, after: { endsAt } });
        return { message: endsAt ? `显示到 ${String(b.endsOn)}（含这天），之后自动撤下` : '已改成不自动撤下' };
      }
      if (action === 'remove') {
        if (n.removed_at) return { message: '这条已经撤下了' };
        await db.query(`UPDATE board_notices SET removed_at = now() WHERE id = $1`, [id]);
        await audit(db, s, 'board_notice_remove', 'board_notice', id, { before: { text: n.text } });
        return { message: '已撤下，首页看板 1 分钟内消失' };
      }
      throw new CrmError('bad_request', '请选择操作');
    });
  } finally {
    clearBoardCache();
  }
}
