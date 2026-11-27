/**
 * 后台综合优化 五：给工作人员的手机通知。
 * ------------------------------------------------------------------
 * 1. 渠道按人设置：短信 / 企业微信 / 邮件。东哥默认短信；企业微信应用配好、本人填了企业微信账号后自动改用企业微信。
 * 2. 立即通知五类：新缴费入会、新入会申请、真实客户咨询、Zelle 待核款、系统故障。其他一律进每日汇总。
 * 3. 每日汇总：洛杉矶时间每天 8:30 一条（今天几件事、最要紧的一件），链接直达「今天」；没有待办不发。
 * 4. 晚 9 点到早 8 点不发，攒到早上（系统故障除外）；同一件事不重复；每天立即通知超过 10 条，后面的并进一条。
 * 5. 通知里的链接直接打开那一条的处理页（必须是已登录的工作人员才能操作；手机登录保持 90 天）。
 * 7. 每人在「设置与团队 → 手机通知」里选收哪几类、走哪个渠道。新同事到岗：跟进类默认发给他，钱和异常同时发东哥。
 * 8. 短信不放客户的完整个人信息，只写“有一条新入会申请”这类，详情点开看。
 * 所有发送都过 notifyGate（总闸关着只记录）。
 */
import { getPool } from '@/lib/db/client';
import { laToday, laWallToIso } from '@/lib/laDate';
import { getSetting, setSetting } from './orders';
import type { NotifyChannel as GateChannel } from './notifyGate';
import { gatedSend as gateSend, wecomAppConfigured } from './notifySend';
import { CrmError } from './events';

export const IMMEDIATE = ['paid_join', 'join_request', 'inquiry', 'zelle_pending', 'system_fault'] as const;
export type ImmediateCategory = (typeof IMMEDIATE)[number];
export type NotifyCategory = ImmediateCategory | 'daily_digest';
export const CATEGORIES: NotifyCategory[] = [...IMMEDIATE, 'daily_digest'];
export const CATEGORY_LABEL: Record<NotifyCategory, string> = {
  paid_join: '新缴费入会',
  join_request: '新入会申请',
  inquiry: '真实客户咨询',
  zelle_pending: 'Zelle 待核款',
  system_fault: '系统故障',
  daily_digest: '每日汇总（早上 8:30）'
};
/** 分组：钱 / 异常（东哥一定收）、跟进（新同事到岗后默认发给他） */
export const MONEY_FAULT: NotifyCategory[] = ['paid_join', 'zelle_pending', 'system_fault'];
export const FOLLOWUP: NotifyCategory[] = ['join_request', 'inquiry'];
export const DAILY_CAP = 10;
export const QUIET_FROM = 21; // 晚 9 点
export const QUIET_TO = 8; // 早 8 点
export const CHANNEL_LABEL: Record<GateChannel, string> = { sms: '短信', wecom: '企业微信', email: '邮件' };

/** 后台网址：正式站用正式域名，测试站 / 本地用自己的域名 */
export function staffBase(): string {
  if (process.env.VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const u = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  if (u) return `https://${u}`;
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

// ── 洛杉矶时间 ────────────────────────────────────────────────────────────
export function laHourMinute(d: Date): { h: number; m: number } {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  return { h: Number(p.find((x) => x.type === 'hour')?.value ?? 0), m: Number(p.find((x) => x.type === 'minute')?.value ?? 0) };
}
export function isQuiet(d: Date): boolean {
  const { h } = laHourMinute(d);
  return h >= QUIET_FROM || h < QUIET_TO;
}
/** 下一个洛杉矶早上 8:00 */
export function nextMorning(d: Date): Date {
  const today = laToday(d);
  const at8 = new Date(laWallToIso(today, '08:00'));
  if (at8.getTime() > d.getTime()) return at8;
  const tomorrow = laToday(new Date(d.getTime() + 24 * 3600_000));
  return new Date(laWallToIso(tomorrow, '08:00'));
}

// ── 每人的设置 ────────────────────────────────────────────────────────────
type StaffRow = {
  key: string; name: string; roles: string[]; phone: string | null; email: string | null; created_at: Date;
  channel: GateChannel | null; categories: string[] | null; wecom_userid: string | null;
};

async function activeStaff(): Promise<StaffRow[]> {
  const { rows } = await getPool().query<StaffRow>(
    `SELECT s.email AS key, s.name, s.roles, s.created_at,
            COALESCE(s.phone, c.phone_e164, ce.phone_e164) AS phone,
            CASE WHEN s.email NOT LIKE 'mp:%' THEN s.email ELSE c.email END AS email,
            p.channel, p.categories, p.wecom_userid
       FROM staff_roles s
       LEFT JOIN contacts c ON c.id = s.mp_contact_id
       LEFT JOIN contacts ce ON ce.email = s.email AND s.email NOT LIKE 'mp:%'
       LEFT JOIN staff_notify_prefs p ON p.staff_key = s.email
      WHERE s.is_active
      ORDER BY s.created_at, s.email`
  );
  return rows;
}

/** 东哥（负责人）：设置 notify_owner；没设置时 = 最早加的、有手机号的在用管理员 */
export async function ownerKey(list?: StaffRow[]): Promise<string | null> {
  const staff = list ?? (await activeStaff());
  const set = await getSetting<string>(getPool(), 'notify_owner', '').catch(() => '');
  if (set && staff.some((s) => s.key === set)) return set;
  return staff.find((s) => s.roles.includes('admin') && s.phone)?.key ?? staff.find((s) => s.roles.includes('admin'))?.key ?? null;
}

/** 默认收哪几类（本人没改过时） */
export function defaultCategories(s: Pick<StaffRow, 'key' | 'roles'>, owner: string | null, hasFollowupColleague: boolean): NotifyCategory[] {
  if (s.key === owner) return hasFollowupColleague ? [...MONEY_FAULT, 'daily_digest'] : [...CATEGORIES];
  if (s.roles.includes('ops') && !s.roles.includes('admin')) return [...FOLLOWUP, 'daily_digest'];
  if (s.roles.includes('finance') && !s.roles.includes('admin')) return ['paid_join', 'zelle_pending'];
  return [];
}

/** 实际渠道：本人选的；没选 → 企业微信配好且填了账号用企业微信，否则短信。目的地缺了按 短信 → 邮件 退。 */
export function effectiveRoute(s: Pick<StaffRow, 'channel' | 'phone' | 'email' | 'wecom_userid'>): { channel: GateChannel; to: string } | null {
  const wecomOk = wecomAppConfigured() && !!s.wecom_userid;
  const want: GateChannel = s.channel ?? (wecomOk ? 'wecom' : 'sms');
  const order: GateChannel[] = want === 'wecom' ? ['wecom', 'sms', 'email'] : want === 'sms' ? ['sms', 'email'] : ['email', 'sms'];
  for (const ch of order) {
    if (ch === 'wecom' && wecomOk) return { channel: 'wecom', to: s.wecom_userid! };
    if (ch === 'sms' && s.phone) return { channel: 'sms', to: s.phone };
    if (ch === 'email' && s.email) return { channel: 'email', to: s.email };
  }
  return null;
}

export type Recipient = { key: string; name: string; channel: GateChannel; to: string; categories: NotifyCategory[]; isOwner: boolean; custom: boolean };

export async function recipients(): Promise<Recipient[]> {
  const staff = await activeStaff();
  const owner = await ownerKey(staff);
  const colleague = staff.some((s) => s.key !== owner && s.roles.includes('ops') && !s.roles.includes('admin'));
  const out: Recipient[] = [];
  for (const s of staff) {
    const route = effectiveRoute(s);
    if (!route) continue;
    const cats = (s.categories ?? defaultCategories(s, owner, colleague)).filter((c): c is NotifyCategory => (CATEGORIES as string[]).includes(c));
    out.push({ key: s.key, name: s.name, ...route, categories: cats, isOwner: s.key === owner, custom: s.categories !== null });
  }
  return out;
}

/** 同一个手机号 / 邮箱（东哥三个微信号各一行）只发一次 */
function dedupeByDestination(list: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  return list.filter((r) => {
    const k = `${r.channel}:${r.to}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── 发一条通知 ────────────────────────────────────────────────────────────
export type StaffEvent = { category: NotifyCategory; key: string; title: string; href?: string | null };

function noticeText(title: string, href: string | null | undefined): string {
  return `SAREC：${title}。${href ? `点开处理：${href.startsWith('http') ? href : staffBase() + href}` : ''}`.trim();
}

/** 立即通知（或按规则攒着 / 合并）。同一 key 同一个人只通知一次。 */
export async function notifyStaff(ev: StaffEvent, now = new Date()): Promise<{ recipients: number; sent: number; held: number; merged: number }> {
  const pool = getPool();
  const all = dedupeByDestination((await recipients()).filter((r) => r.categories.includes(ev.category)));
  const immediate = (IMMEDIATE as readonly string[]).includes(ev.category);
  const day = laToday(now);
  let sent = 0;
  let held = 0;
  let merged = 0;
  for (const r of all) {
    let status: 'pending' | 'held' | 'digest' = immediate ? 'pending' : 'digest';
    let sendAfter: Date | null = null;
    if (status === 'pending' && ev.category !== 'system_fault' && isQuiet(now)) {
      status = 'held';
      sendAfter = nextMorning(now);
    }
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO staff_notices (staff_key, category, dedupe_key, title, href, status, send_after, la_day)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (staff_key, dedupe_key) DO NOTHING RETURNING id`,
      [r.key, ev.category, ev.key, ev.title.slice(0, 120), ev.href ?? null, status, sendAfter, status === 'held' ? laToday(sendAfter!) : day]
    );
    if (!rows[0]) continue; // 同一件事已经通知过
    if (status === 'held') { held++; continue; }
    if (status === 'digest') continue;
    const id = rows[0].id;
    const { rows: c } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM staff_notices WHERE staff_key = $1 AND la_day = $2 AND status = 'sent' AND category <> 'merged_notice'`,
      [r.key, day]
    );
    if (c[0].n >= DAILY_CAP) {
      // 今天已经立即通知了 10 条：后面的并进一条（只发一次“后面的合并”提示，其余不再逐条发）
      await pool.query(`UPDATE staff_notices SET status = 'merged' WHERE id = $1`, [id]);
      merged++;
      const { rows: first } = await pool.query(
        `INSERT INTO staff_notices (staff_key, category, dedupe_key, title, href, status, la_day, sent_at)
         VALUES ($1, 'merged_notice', $2, '今天的通知超过 10 条，后面的合并', '/zh/staff', 'sent', $3, now())
         ON CONFLICT (staff_key, dedupe_key) DO NOTHING RETURNING id`,
        [r.key, `merged:${day}`, day]
      );
      if (first[0]) {
        await gateSend({ kind: '工作人员通知', channel: r.channel, to: r.to, subject: 'SAREC 通知', ref: `merged:${day}`, dedupeKey: `staff_merged:${r.key}:${day}`,
          text: noticeText(`今天的立即通知已超过 ${DAILY_CAP} 条，后面的不再逐条发，合并在这一条里，请打开「今天」页看全部`, '/zh/staff') });
      }
      continue;
    }
    const g = await gateSend({ kind: '工作人员通知', channel: r.channel, to: r.to, subject: `SAREC：${ev.title}`, text: noticeText(ev.title, ev.href), ref: String(id), dedupeKey: `staff_notice:${id}` });
    await pool.query(`UPDATE staff_notices SET status = 'sent', sent_at = now() WHERE id = $1`, [id]);
    if (g.status !== 'failed') sent++;
  }
  return { recipients: all.length, sent, held, merged };
}

/** 安全版：通知失败不影响业务（只记一条待处理） */
export async function notifyStaffSafe(ev: StaffEvent): Promise<void> {
  try {
    await notifyStaff(ev);
  } catch (e) {
    console.warn('[staffNotify]', e instanceof Error ? e.message.slice(0, 80) : 'error');
  }
}

/** 早上 8 点以后：把夜里攒的合成一条发出去（每人一条） */
export async function flushHeld(now = new Date()): Promise<{ people: number; items: number }> {
  if (isQuiet(now)) return { people: 0, items: 0 };
  const pool = getPool();
  const { rows } = await pool.query<{ staff_key: string; ids: string[]; titles: string[]; hrefs: (string | null)[] }>(
    `SELECT staff_key, array_agg(id::text ORDER BY created_at) AS ids, array_agg(title ORDER BY created_at) AS titles, array_agg(href ORDER BY created_at) AS hrefs
       FROM staff_notices WHERE status = 'held' AND send_after <= $1 GROUP BY staff_key`,
    [now]
  );
  if (!rows.length) return { people: 0, items: 0 };
  const byKey = new Map((await recipients()).map((r) => [r.key, r]));
  let items = 0;
  for (const h of rows) {
    const r = byKey.get(h.staff_key);
    await pool.query(`UPDATE staff_notices SET status = 'sent', sent_at = now(), la_day = $2 WHERE id = ANY($1::bigint[])`, [h.ids, laToday(now)]);
    items += h.ids.length;
    if (!r) continue;
    const text = h.ids.length === 1
      ? noticeText(`夜里来了一件事：${h.titles[0]}`, h.hrefs[0] ?? '/zh/staff')
      : noticeText(`夜里来了 ${h.ids.length} 件事：${h.titles.slice(0, 3).join('；')}${h.ids.length > 3 ? '……' : ''}`, '/zh/staff');
    await gateSend({ kind: '工作人员通知', channel: r.channel, to: r.to, subject: 'SAREC：夜里攒下的通知', text, ref: `held:${h.ids[0]}`, dedupeKey: `staff_held:${h.staff_key}:${h.ids[0]}` });
  }
  return { people: rows.length, items };
}

// ── 每日汇总（洛杉矶 8:30）──────────────────────────────────────────────────
export type DigestItem = { title: string; priority: number; id?: string; review?: boolean };

/** 8:30 以后、当天还没发过的人：今天几件事 + 最要紧的一件；没有待办不发 */
export async function runDigest(now = new Date(), items?: () => Promise<DigestItem[]>): Promise<{ sent: number; empty: boolean; skipped: string | null }> {
  const { h, m } = laHourMinute(now);
  if (h < 8 || (h === 8 && m < 30) || h >= QUIET_FROM) return { sent: 0, empty: false, skipped: 'not_time' };
  const pool = getPool();
  const day = laToday(now);
  const list = items ? await items() : await (await import('./today/digestItems')).digestItems(now);
  const people = dedupeByDestination((await recipients()).filter((r) => r.categories.includes('daily_digest')));
  let sent = 0;
  for (const r of people) {
    const { rows } = await pool.query(
      `INSERT INTO staff_digests (staff_key, la_day, items, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING 1`,
      [r.key, day, list.length, list.length ? 'pending' : 'empty']
    );
    if (!rows[0] || !list.length) continue;
    const top = [...list].sort((a, b) => a.priority - b.priority)[0];
    const g = await gateSend({
      kind: '每日汇总', channel: r.channel, to: r.to, subject: `SAREC 今天有 ${list.length} 件事`, ref: `digest:${day}`, dedupeKey: `staff_digest:${r.key}:${day}`,
      // 指令 102：链接直达最要紧的那一条（「今天」页滚到它、按钮在卡片上）；有要审的写出几件
      text: `SAREC 今天有 ${list.length} 件事${list.some((x) => x.review) ? `（等你审 ${list.filter((x) => x.review).length} 件）` : ''}，最要紧的是：${top.title}。点开处理：${staffBase()}/zh/staff${top.id ? `?item=${encodeURIComponent(top.id)}` : ''}`
    });
    await pool.query(`UPDATE staff_digests SET status = $3 WHERE staff_key = $1 AND la_day = $2`, [r.key, day, g.status]);
    sent++;
  }
  return { sent, empty: !list.length, skipped: null };
}

// ── 后台设置页 ────────────────────────────────────────────────────────────
export async function notifySettings(viewerKey: string, isAdmin: boolean) {
  const { notifyLive } = await import('./notifyGate');
  const staff = await activeStaff();
  const owner = await ownerKey(staff);
  const rec = new Map((await recipients()).map((r) => [r.key, r]));
  const people = staff
    .filter((s) => isAdmin || s.key === viewerKey)
    .map((s) => {
      const r = rec.get(s.key);
      return {
        key: s.key, name: s.name, isMe: s.key === viewerKey, isOwner: s.key === owner,
        channel: s.channel, effectiveChannel: r?.channel ?? null, wecomUserid: s.wecom_userid,
        hasPhone: !!s.phone, hasEmail: !!s.email,
        categories: r?.categories ?? [], custom: s.categories !== null
      };
    });
  return {
    live: await notifyLive(),
    wecomReady: wecomAppConfigured(),
    categories: CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABEL[c], immediate: c !== 'daily_digest' })),
    rules: [
      '立即通知只有五类：新缴费入会、新入会申请、真实客户咨询、Zelle 待核款、系统故障；其他都进每天早上 8:30 的汇总。',
      '晚 9 点到早 8 点不发，攒到早上 8 点合成一条（系统故障除外）。',
      '同一件事只通知一次；一天立即通知超过 10 条，后面的合并成一条。',
      '短信里不放客户的姓名电话，只写“有一条新入会申请”这类，点链接打开看详情。'
    ],
    people
  };
}

export async function saveNotifyPrefs(by: { key: string; name: string; isAdmin: boolean }, b: { staffKey?: string; channel?: string; categories?: unknown; wecomUserid?: string | null; owner?: boolean; reset?: boolean }) {
  const key = String(b.staffKey || by.key);
  if (key !== by.key && !by.isAdmin) throw new CrmError('forbidden', '只能改自己的通知设置（管理员可以改所有人的）');
  const { rows } = await getPool().query(`SELECT 1 FROM staff_roles WHERE email = $1 AND is_active`, [key]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这位工作人员');
  if (b.reset) {
    await getPool().query(`UPDATE staff_notify_prefs SET categories = NULL, updated_by = $2, updated_at = now() WHERE staff_key = $1`, [key, by.name]);
  }
  const channel = b.channel === undefined ? undefined : ['sms', 'wecom', 'email'].includes(String(b.channel)) ? String(b.channel) : null;
  if (b.channel !== undefined && !channel) throw new CrmError('bad_request', '渠道只能选短信、企业微信或邮件');
  const cats = b.categories === undefined ? undefined : (Array.isArray(b.categories) ? b.categories : []).map(String).filter((c) => (CATEGORIES as string[]).includes(c));
  await getPool().query(
    `INSERT INTO staff_notify_prefs (staff_key, channel, categories, wecom_userid, updated_by)
     VALUES ($1, COALESCE($2, 'sms'), $3, $4, $5)
     ON CONFLICT (staff_key) DO UPDATE SET
       channel = COALESCE($2, staff_notify_prefs.channel),
       categories = CASE WHEN $6::boolean THEN $3 ELSE staff_notify_prefs.categories END,
       wecom_userid = CASE WHEN $7::boolean THEN $4 ELSE staff_notify_prefs.wecom_userid END,
       updated_by = $5, updated_at = now()`,
    [key, channel ?? null, cats ?? null, b.wecomUserid ? String(b.wecomUserid).trim().slice(0, 64) : null, by.name, cats !== undefined, b.wecomUserid !== undefined]
  );
  if (b.owner && by.isAdmin) await setSetting(getPool(), 'notify_owner', key, by.name);
  return { ok: true };
}

/** 后台“最近的通知”：这个人自己的（管理员看全部） */
export async function recentNotices(viewerKey: string, isAdmin: boolean, limit = 50) {
  const { rows } = await getPool().query(
    `SELECT n.id, n.staff_key, s.name AS staff_name, n.category, n.title, n.href, n.status, n.send_after, n.sent_at, n.created_at
       FROM staff_notices n LEFT JOIN staff_roles s ON s.email = n.staff_key
      WHERE ($2::boolean OR n.staff_key = $1) ORDER BY n.created_at DESC LIMIT $3`,
    [viewerKey, isAdmin, limit]
  );
  const { mpPathForHref } = await import('./today/mp');
  // 1.5.0 体验1（第三部分 8）：mpPath = 小程序工作台里对应那一条（收款相关的为 null，只在网站办）
  return rows.map((r) => ({ ...r, category_label: CATEGORY_LABEL[r.category as NotifyCategory] ?? '合并提示', mpPath: mpPathForHref(r.href, r.category) }));
}
