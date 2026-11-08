/**
 * 1.3 L：功能排行——用数据决定首页放什么。
 * - 每个功能：用了多少次、多少人用；带来了多少（访问 → 报名 → 到场 → 入会 → 有效咨询，口径同 channels.funnel，
 *   按“最后一次带来这个人的功能”归因，另列首次来源）。按 7 天 / 30 天 / 某一场活动切换。
 * - 数据只来自自己的打点（track_events）和报名、签到、入会、咨询记录；不接第三方统计。
 * - 首页 8 个入口的顺序在后台调整，小程序立即生效；不做按数据自动重排。
 * - 每月 1 号发“功能月报”：最常用 3 个、带来报名和入会最多 3 个、几乎没人用 3 个 + 调整建议（规则生成，不调 AI）。
 * - 活动少于 2 场时注明“样本太少，仅供参考”。
 */
import { getPool } from '@/lib/db/client';
import { funnel, type Funnel, type Window } from './channels';
import { getSetting, setSetting } from './orders';
import type { Db } from './profile';

export const HOME_ENTRIES: { key: string; label: string }[] = [
  { key: 'events', label: '活动报名' }, { key: 'mine', label: '我的报名' }, { key: 'checkin', label: '现场签到' }, { key: 'invite', label: '邀请好友' },
  { key: 'card', label: '我的名片' }, { key: 'benefits', label: '会员权益' }, { key: 'rooms', label: '会议室' }, { key: 'contact', label: '联系商会' }
];

type Feature = {
  key: string;
  label: string;
  group: '首页入口' | '传播' | '照片' | '获客';
  /** 使用：打点名（可限定 target） */
  uses: { name: string; target?: string }[];
  /** 带来：报名 / 访问上的 channel 值；companion = 同行人；channelsTable = 全部渠道码 */
  brings?: { channels?: string[]; companion?: boolean; channelsTable?: boolean };
};

export const FEATURES: Feature[] = [
  ...HOME_ENTRIES.map((e) => ({ key: `home:${e.key}`, label: `首页入口 · ${e.label}`, group: '首页入口' as const, uses: [{ name: 'home_entry', target: e.key }] })),
  { key: 'poster', label: '邀请海报', group: '传播', uses: [{ name: 'poster' }, { name: 'poster_save' }], brings: { channels: ['poster'] } },
  { key: 'card', label: '电子名片', group: '传播', uses: [{ name: 'card_open' }, { name: 'card_share' }], brings: { channels: ['card'] } },
  { key: 'share', label: '分享卡片（群聊 / 朋友圈）', group: '传播', uses: [{ name: 'share' }, { name: 'share_timeline' }], brings: { channels: ['share', 'timeline'] } },
  { key: 'companion', label: '带一位朋友', group: '获客', uses: [{ name: 'companion_add' }], brings: { companion: true } },
  { key: 'group', label: '群报名', group: '获客', uses: [{ name: 'group_signup' }], brings: { channels: ['group'] } },
  { key: 'channels', label: '渠道码（全部合作渠道）', group: '获客', uses: [{ name: 'visit' }], brings: { channelsTable: true } },
  { key: 'album', label: '活动相册', group: '照片', uses: [{ name: 'album_open' }], brings: { channels: ['album'] } },
  { key: 'photo_upload', label: '上传我拍的照片', group: '照片', uses: [{ name: 'photo_upload' }], brings: { channels: ['photo'] } },
  { key: 'beauty', label: '美颜', group: '照片', uses: [{ name: 'beauty_apply' }] },
  { key: 'photo_share', label: '照片分享', group: '照片', uses: [{ name: 'photo_share' }], brings: { channels: ['photo'] } }
];

export type FeatureRow = { key: string; label: string; group: string; times: number; people: number; brings: Funnel | null };

export async function featureRanking(w: Window = {}): Promise<{ rows: FeatureRow[]; eventsInWindow: number; sampleTooSmall: boolean; window: Window }> {
  const pool = getPool();
  const days = w.days && w.days > 0 ? Math.floor(w.days) : null;
  const evSlug = w.eventId ? (await pool.query<{ slug: string }>(`SELECT slug FROM events WHERE id = $1`, [w.eventId])).rows[0]?.slug ?? null : null;
  const { rows: chans } = await pool.query<{ code: string }>(`SELECT code FROM channels`);
  const rows: FeatureRow[] = [];
  for (const f of FEATURES) {
    let times = 0;
    let people = 0;
    for (const u of f.uses) {
      const isChannelVisit = f.key === 'channels';
      const { rows: r } = await pool.query<{ n: number; p: number }>(
        `SELECT count(*)::int AS n, count(DISTINCT coalesce(contact_id::text, visitor))::int AS p FROM track_events
          WHERE name = $1 AND ($2::text IS NULL OR target = $2)
            AND ($3::int IS NULL OR created_at > now() - make_interval(days => $3))
            AND ($4::text IS NULL OR target = $4 OR meta->>'slug' = $4)
            AND (NOT $5::boolean OR channel LIKE 'c-%')`,
        [u.name, u.target ?? null, days, f.group === '首页入口' ? null : evSlug, isChannelVisit]
      );
      times += r[0].n;
      people += r[0].p;
    }
    let brings: Funnel | null = null;
    if (f.brings) {
      const channels = f.brings.channelsTable ? chans.map((c) => c.code) : (f.brings.channels ?? []);
      brings = await funnel(pool, { channels, companion: f.brings.companion }, w);
    }
    rows.push({ key: f.key, label: f.label, group: f.group, times, people, brings });
  }
  const { rows: ev } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM events WHERE starts_at < now() AND event_status <> 'cancelled'
        AND ($1::int IS NULL OR starts_at > now() - make_interval(days => $1))`,
    [days]
  );
  const eventsInWindow = w.eventId ? 1 : ev[0].n;
  return { rows, eventsInWindow, sampleTooSmall: !w.eventId && eventsInWindow < 2, window: w };
}

// ── 首页入口顺序（后台调整，小程序 / 网站手机版立即生效）─────────────────

export async function homeEntriesOrder(db: Db = getPool()): Promise<string[]> {
  const saved = await getSetting<string[]>(db, 'home_entries_order', []);
  const known = HOME_ENTRIES.map((e) => e.key);
  const ordered = (Array.isArray(saved) ? saved : []).filter((k) => known.includes(k));
  return [...ordered, ...known.filter((k) => !ordered.includes(k))];
}

export async function setHomeEntriesOrder(order: unknown, by: string): Promise<string[]> {
  const known = HOME_ENTRIES.map((e) => e.key);
  const list = Array.isArray(order) ? order.filter((k): k is string => typeof k === 'string' && known.includes(k)) : [];
  const full = Array.from(new Set([...list, ...known]));
  await setSetting(getPool(), 'home_entries_order', full, by);
  return full;
}

// ── 功能月报（每月 1 号，数据库直接生成，不调 AI）────────────────────────

export async function buildFeatureReport(): Promise<{ subject: string; text: string }> {
  const r = await featureRanking({ days: 30 });
  const nonHome = r.rows.filter((x) => x.group !== '首页入口');
  const top = [...r.rows].sort((a, b) => b.times - a.times).slice(0, 3);
  const bringers = nonHome.filter((x) => x.brings).sort((a, b) => (b.brings!.registered + b.brings!.joined * 5) - (a.brings!.registered + a.brings!.joined * 5)).slice(0, 3);
  const unused = [...r.rows].sort((a, b) => a.people - b.people).slice(0, 3);
  const home = r.rows.filter((x) => x.group === '首页入口').sort((a, b) => b.times - a.times);
  const order = await homeEntriesOrder();
  const label = (k: string) => r.rows.find((x) => x.key === `home:${k}`)?.label.replace('首页入口 · ', '') ?? k;
  const lines: string[] = [];
  lines.push('SAREC 功能月报（最近 30 天）');
  if (r.sampleTooSmall) lines.push(`※ 这段时间只有 ${r.eventsInWindow} 场活动，样本太少，仅供参考。`);
  lines.push('');
  lines.push('【最常用的 3 个】');
  top.forEach((x, i) => lines.push(`${i + 1}. ${x.label}：${x.times} 次，${x.people} 人`));
  lines.push('');
  lines.push('【带来报名和入会最多的 3 个】');
  bringers.forEach((x, i) => lines.push(`${i + 1}. ${x.label}：访问 ${x.brings!.visits}，报名 ${x.brings!.registered}，到场 ${x.brings!.arrived}，入会 ${x.brings!.joined}，有效咨询 ${x.brings!.inquiries}`));
  lines.push('');
  lines.push('【几乎没人用的 3 个】');
  unused.forEach((x, i) => lines.push(`${i + 1}. ${x.label}：${x.times} 次，${x.people} 人`));
  lines.push('');
  lines.push('【首页入口顺序建议】');
  lines.push(`现在的顺序：${order.map(label).join(' / ')}`);
  const suggested = home.map((x) => x.key.replace('home:', ''));
  const moved = suggested.slice(0, 4).filter((k) => order.indexOf(k) >= 4);
  if (!home.some((x) => x.times > 0)) lines.push('这个月首页入口还没有点击数据，暂不建议调整。');
  else if (moved.length) lines.push(`按点击量，${moved.map(label).join('、')} 点得多但排在第二行，可以考虑往前挪。建议顺序：${suggested.map(label).join(' / ')}`);
  else lines.push('点得多的入口已经在第一行，暂不需要调整。');
  lines.push('');
  lines.push('首页顺序在后台“功能排行”页调整，小程序立即生效，不用发版本。不会按数据自动重排。');
  lines.push('（本邮件由数据库直接生成，未调用 AI。）');
  const month = new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'long' }).format(new Date());
  return { subject: `【SAREC 功能月报】${month}${r.sampleTooSmall ? '（样本太少，仅供参考）' : ''}`, text: lines.join('\n') };
}

/** 每月 1 号（洛杉矶时间）发一次功能月报；同一个月只发一次 */
export async function runFeatureReport(now: Date = new Date()): Promise<string> {
  const { laToday } = await import('@/lib/laDate');
  const day = laToday(now);
  if (!day.endsWith('-01')) return 'not_first_of_month';
  const month = day.slice(0, 7);
  const pool = getPool();
  if ((await getSetting<string>(pool, 'feature_report_sent', '')) === month) return 'already_sent';
  const { digestEmail } = await import('@/lib/agent/config');
  const { getResend, getFromAddress, isEmailConfigured } = await import('@/lib/email/resend-client');
  const to = digestEmail();
  if (!to || !isEmailConfigured()) return 'skipped_no_recipient';
  const r = await buildFeatureReport();
  const res = await getResend().emails.send({ from: getFromAddress(), to, subject: r.subject, text: r.text });
  if (res.error) throw new Error(res.error.message);
  await setSetting(pool, 'feature_report_sent', month, 'system');
  return 'sent';
}
