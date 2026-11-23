/**
 * 指令 44（11/22）：「数据」页每个数字点开看“是谁”。只读，不改数据（导出记一条操作记录）。
 *
 * 口径——和上面的数字用同一段 SQL（lib/crm/dataSummary.ts 导出的 NAMED_CTE / CAME_CTE / FIRST_TIME_SQL / JOINED_WHERE，
 * 第 4 个问题用 lib/crm/channels.ts 的 FUNNEL_REGS_CTE / FUNNEL_JOINED_SQL），所以名单人数和数字一定对得上：
 * - new      新人：这段时间新建、有姓名或手机或邮箱的档案。按建档时间倒序。
 * - shells   只打开过、没登记：这段时间新建、没有姓名手机邮箱的“微信用户”。同一个人后来登记了 = 同一份档案补上了姓名手机（自动移到新人），
 *            或被工作人员合并掉（合并掉的不算），所以不会重复。
 * - arrived  到场：这段时间签到的人，按活动分组；一个人到了两场会在两场里各出现一次，人数按人去重。
 * - joined   入会：已缴费、会籍在这段时间开始的入会申请（一条申请一行）。旁边另列“带会员标识、但不在这个数里”的人。
 * - bringer  第 4 个问题某个功能 / 渠道：这段时间经它报名的人（到场、入会打勾），口径同「功能排行」「渠道码」。
 * - visitors 这段时间谁来过：这段时间在小程序或网站上有动作（登录、打开时自动续登录、点击）的人。
 * 内部账号、审核演示、测试账号（contacts.account_kind 有值）都不算，和四个数同一条规则。
 *
 * 数据里没有的不编：
 * - 小程序不记“打开了一次”这种事件，也不记逐页浏览；“来了几次”按有动作的天数算，“看了什么”是点过的功能。
 * - 来源：报名时记的首次来源 → 第一次带来源的访问 → 建档方式；都没有就写“没记录”（早期版本没记来源）。场景值（扫码 / 搜索……）没按人记。
 */
import { getPool } from '@/lib/db/client';
import type { Staff } from './auth';
import { audit } from './staff';
import { findRoleSub } from './questionBank';
import { realContact } from './accountKind';
import { CAME_CTE, FIRST_TIME_SQL, JOINED_WHERE, NAMED_CTE, clampDays } from './dataSummary';
import { FEATURES } from './features';
import { funnelPeople } from './channels';
import { ACQ_LABEL, CHANNEL_SOURCE_LABEL, trackShort } from './trackLabels';
import { CrmError } from './events';

export const LISTS = ['new', 'shells', 'arrived', 'joined', 'bringer', 'visitors'] as const;
export type ListKind = (typeof LISTS)[number];

/** 会员（和「客户」页同一口径：会籍没过期、申请已批准 / 已缴费） */
const MEMBER_LATERAL = `LEFT JOIN LATERAL (
       SELECT a.selected_tier_slug AS tier, a.membership_start_date::text AS start, a.membership_end_date::text AS until,
              (SELECT t.name_zh FROM membership_tiers t WHERE t.slug = a.selected_tier_slug) AS tier_name
         FROM applications a
        WHERE a.contact_id = c.id AND a.membership_end_date >= current_date
          AND (a.application_status IN ('approved','paid','second_payment_due')
               OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))
        ORDER BY a.membership_end_date DESC LIMIT 1) m ON true`;

export type Person = {
  id: string; name: string | null; memberNo: number; phone: string | null; email: string | null; wechat: string | null;
  company: string | null; industry: string | null; createdAt: string; source: string; did: string[];
  isMember: boolean; tierName: string | null; memberUntil: string | null;
};

const chanName = (code: string | null, names: Map<string, string>) =>
  !code ? null : code.startsWith('c-') ? (names.get(code) ? `渠道码 · ${names.get(code)}` : '渠道码') : CHANNEL_SOURCE_LABEL[code] ?? '其他来源';

/** 一批人的基本资料、来源、来了以后做了什么、是不是会员 */
async function people(ids: string[]): Promise<Map<string, Person>> {
  const out = new Map<string, Person>();
  if (!ids.length) return out;
  const pool = getPool();
  const { rows: ch } = await pool.query<{ code: string; name: string }>(`SELECT code, name FROM channels`);
  const names = new Map(ch.map((c) => [c.code, c.name]));
  const { rows } = await pool.query<{
    id: string; name: string | null; member_no: number; phone: string | null; email: string | null; wechat: string | null; company: string | null;
    card_industry: string | null; role_sub: string | null; created_at: Date; first_channel: string | null; acquisition_source: string | null; referrer: string | null;
    visit_channel: string | null; visit_ref: string | null; regs: number; arrived: number; card: boolean; pro: boolean; post: boolean;
    tier: string | null; tier_name: string | null; until: string | null;
  }>(
    `WITH fv AS (
       SELECT DISTINCT ON (t.contact_id) t.contact_id, t.channel, t.ref_contact_id FROM track_events t
        WHERE t.name = 'visit' AND t.contact_id = ANY($1::uuid[]) ORDER BY t.contact_id, t.created_at)
     SELECT c.id, NULLIF(NULLIF(trim(c.name), ''), '微信用户') AS name, c.member_no::int AS member_no,
            coalesce(c.phone_e164, (SELECT x.value FROM contact_methods x WHERE x.contact_id = c.id AND x.kind = 'phone' AND x.is_current LIMIT 1)) AS phone,
            coalesce(c.email, (SELECT x.value FROM contact_methods x WHERE x.contact_id = c.id AND x.kind = 'email' AND x.is_current LIMIT 1)) AS email,
            mc.wechat_id AS wechat,
            coalesce(NULLIF(mc.company, ''), (SELECT a.company_name FROM applications a WHERE a.contact_id = c.id AND NULLIF(a.company_name, '') IS NOT NULL ORDER BY a.created_at DESC LIMIT 1)) AS company,
            mc.industry AS card_industry, c.role_sub, c.created_at, c.first_channel, c.acquisition_source,
            (SELECT NULLIF(r.name, '微信用户') FROM contacts r WHERE r.id = c.referred_by) AS referrer,
            fv.channel AS visit_channel, (SELECT NULLIF(r.name, '微信用户') FROM contacts r WHERE r.id = fv.ref_contact_id) AS visit_ref,
            (SELECT count(*)::int FROM registrations r WHERE r.contact_id = c.id AND r.status <> 'cancelled') AS regs,
            (SELECT count(*)::int FROM registrations r WHERE r.contact_id = c.id AND r.arrival_status = 'checked_in') AS arrived,
            (mc.contact_id IS NOT NULL AND (NULLIF(mc.company, '') IS NOT NULL OR NULLIF(mc.title, '') IS NOT NULL)) AS card,
            EXISTS (SELECT 1 FROM jobs_pros j WHERE j.contact_id = c.id) AS pro,
            EXISTS (SELECT 1 FROM jobs_posts j WHERE j.contact_id = c.id) AS post,
            m.tier, m.tier_name, m.until
       FROM contacts c
       LEFT JOIN member_cards mc ON mc.contact_id = c.id
       LEFT JOIN fv ON fv.contact_id = c.id
       ${MEMBER_LATERAL}
      WHERE c.id = ANY($1::uuid[])`,
    [ids]
  );
  for (const r of rows) {
    let source: string;
    if (r.first_channel) source = chanName(r.first_channel, names)! + (r.referrer ? `（${r.referrer} 邀请）` : '');
    else if (r.referrer) source = `${r.referrer} 邀请`;
    else if (r.visit_channel || r.visit_ref) source = (chanName(r.visit_channel, names) ?? '分享') + (r.visit_ref ? `（${r.visit_ref} 分享）` : '');
    else if (r.acquisition_source) source = ACQ_LABEL[r.acquisition_source] ?? '其他来源';
    else source = '没记录（早期版本没记来源）';
    const did: string[] = [];
    if (r.regs) did.push(`报名 ${r.regs} 场`);
    if (r.arrived) did.push(`签到 ${r.arrived} 次`);
    if (r.card) did.push('做了名片');
    if (r.pro) did.push('登记接活儿');
    if (r.post) did.push('发布活儿');
    out.set(r.id, {
      id: r.id, name: r.name, memberNo: r.member_no, phone: r.phone, email: r.email, wechat: r.wechat, company: r.company,
      industry: findRoleSub(r.role_sub)?.label ?? r.card_industry ?? null, createdAt: r.created_at.toISOString(), source, did,
      isMember: !!r.tier, tierName: r.tier_name ?? r.tier, memberUntil: r.until
    });
  }
  return out;
}

export type Activity = { firstAt: string | null; lastAt: string | null; days: number; clients: string[]; top: string[] };

/** 一批人在小程序 / 网站上的动作：最近一次、有动作的天数、用的哪一端、点得最多的功能（days 为空 = 不限时间） */
async function activity(ids: string[], days: number | null): Promise<Map<string, Activity>> {
  const out = new Map<string, Activity>();
  if (!ids.length) return out;
  const pool = getPool();
  const win = `($2::int IS NULL OR at > now() - make_interval(days => $2))`;
  const { rows } = await pool.query<{ id: string; first_at: Date | null; last_at: Date | null; days: number; clients: string[] }>(
    `WITH a AS (
       SELECT t.contact_id AS id, t.created_at AS at, CASE WHEN t.client = 'mp' THEN '小程序' WHEN t.client = 'web' THEN '网站' END AS cl
         FROM track_events t WHERE t.contact_id = ANY($1::uuid[])
       UNION ALL SELECT s.contact_id, s.created_at, CASE WHEN s.channel = 'miniprogram' THEN '小程序' ELSE '网站' END FROM sessions s WHERE s.contact_id = ANY($1::uuid[])
       UNION ALL SELECT s.contact_id, s.last_seen_at, CASE WHEN s.channel = 'miniprogram' THEN '小程序' ELSE '网站' END FROM sessions s WHERE s.contact_id = ANY($1::uuid[]) AND s.last_seen_at IS NOT NULL)
     SELECT id, min(at) AS first_at, max(at) AS last_at, count(DISTINCT (at AT TIME ZONE 'America/Los_Angeles')::date)::int AS days,
            array_remove(array_agg(DISTINCT cl), NULL) AS clients
       FROM a WHERE ${win} GROUP BY id`,
    [ids, days]
  );
  const { rows: clicks } = await pool.query<{ id: string; name: string; target: string | null; n: number }>(
    `SELECT t.contact_id AS id, t.name, t.target, count(*)::int AS n FROM track_events t
      WHERE t.contact_id = ANY($1::uuid[]) AND ($2::int IS NULL OR t.created_at > now() - make_interval(days => $2))
      GROUP BY 1, 2, 3`,
    [ids, days]
  );
  const tally = new Map<string, Map<string, number>>();
  for (const c of clicks) {
    const m = tally.get(c.id) ?? new Map<string, number>();
    const k = trackShort(c.name, c.target);
    m.set(k, (m.get(k) ?? 0) + c.n);
    tally.set(c.id, m);
  }
  const topOf = (m?: Map<string, number>) => (m ? Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} ${n} 次`) : []);
  for (const r of rows) out.set(r.id, { firstAt: r.first_at?.toISOString() ?? null, lastAt: r.last_at?.toISOString() ?? null, days: r.days, clients: r.clients ?? [], top: topOf(tally.get(r.id)) });
  return out;
}

const NO_ACT: Activity = { firstAt: null, lastAt: null, days: 0, clients: [], top: [] };

// ── 各个名单 ──────────────────────────────────────────────────────────

async function listNew(d: number) {
  const { rows } = await getPool().query<{ id: string }>(
    `WITH named AS (${NAMED_CTE}) SELECT n.id FROM named n JOIN contacts c ON c.id = n.id WHERE n.real ORDER BY c.created_at DESC`, [d]);
  const p = await people(rows.map((r) => r.id));
  return { people: rows.map((r) => p.get(r.id)!).filter(Boolean) };
}

async function listShells(d: number) {
  const { rows } = await getPool().query<{ id: string }>(
    `WITH named AS (${NAMED_CTE}) SELECT n.id FROM named n JOIN contacts c ON c.id = n.id WHERE NOT n.real ORDER BY c.created_at DESC`, [d]);
  const ids = rows.map((r) => r.id);
  const [p, act] = await Promise.all([people(ids), activity(ids, null)]);
  return {
    people: ids.map((id) => {
      const x = p.get(id)!;
      const a = act.get(id) ?? NO_ACT;
      // 第一次打开 = 建档时间（小程序第一次登录时建档）
      return { id, memberNo: x.memberNo, firstAt: x.createdAt, lastAt: a.lastAt ?? x.createdAt, days: Math.max(1, a.days), clients: a.clients, top: a.top, source: x.source };
    })
  };
}

async function listArrived(d: number) {
  const { rows } = await getPool().query<{ contact_id: string; event_id: string; title: string; starts_at: Date; checked_in_at: Date; nth: number; first_in_window: boolean }>(
    `WITH came AS (${CAME_CTE})
     SELECT r.contact_id, e.id AS event_id, e.title, e.starts_at, r.checked_in_at,
            (SELECT count(*)::int FROM registrations o WHERE o.contact_id = r.contact_id AND o.arrival_status = 'checked_in' AND o.checked_in_at <= r.checked_in_at) AS nth,
            ${FIRST_TIME_SQL('r.contact_id')} AS first_in_window
       FROM came JOIN registrations r ON r.contact_id = came.contact_id AND r.arrival_status = 'checked_in' AND r.checked_in_at > now() - make_interval(days => $1)
       JOIN events e ON e.id = r.event_id
      ORDER BY e.starts_at DESC, r.checked_in_at`,
    [d]
  );
  const p = await people(Array.from(new Set(rows.map((r) => r.contact_id))));
  const groups = new Map<string, { eventId: string; title: string; startsAt: string; people: (Person & { firstTime: boolean; nth: number })[] }>();
  // 第一次来：和上面“其中第一次来的”同一口径——这段时间之前没签到过的人，在这段时间里最早签到的那一场标“第一次来”
  const earliest = new Map<string, number>();
  for (const r of rows) if (r.first_in_window) earliest.set(r.contact_id, Math.min(earliest.get(r.contact_id) ?? Infinity, r.checked_in_at.getTime()));
  const firstRow = new Set<string>();
  const marked = new Set<string>();
  for (const r of rows) {
    if (marked.has(r.contact_id) || earliest.get(r.contact_id) !== r.checked_in_at.getTime()) continue;
    marked.add(r.contact_id);
    firstRow.add(`${r.contact_id}|${r.event_id}`);
  }
  for (const r of rows) {
    const g = groups.get(r.event_id) ?? { eventId: r.event_id, title: r.title, startsAt: r.starts_at.toISOString(), people: [] };
    g.people.push({ ...p.get(r.contact_id)!, firstTime: firstRow.has(`${r.contact_id}|${r.event_id}`), nth: r.nth });
    groups.set(r.event_id, g);
  }
  const uniq = new Set(rows.map((r) => r.contact_id));
  const first = new Set(rows.filter((r) => r.first_in_window).map((r) => r.contact_id));
  return { total: uniq.size, first: first.size, events: Array.from(groups.values()) };
}

const METHOD: Record<string, string> = { stripe: '网上刷卡', zelle: 'Zelle', check: '支票', offline: '线下', bank_transfer: '银行转账', cash: '现金', waived: '免缴' };

async function listJoined(d: number) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; contact_id: string; start: string; tier_name: string | null; plan: string | null; paid: number | null; method: string | null; paid_at: Date | null }>(
    `SELECT a.id, a.contact_id, a.membership_start_date::text AS start, a.payment_plan AS plan,
            (SELECT t.name_zh FROM membership_tiers t WHERE t.slug = a.selected_tier_slug) AS tier_name,
            coalesce((SELECT sum(p.amount_cents)::int FROM payments p WHERE p.application_id = a.id AND p.payment_status = 'paid'), a.paid_amount_cents) AS paid,
            (SELECT p.payment_provider FROM payments p WHERE p.application_id = a.id AND p.payment_status = 'paid' ORDER BY p.paid_at DESC NULLS LAST LIMIT 1) AS method,
            coalesce(a.first_payment_paid_at, (SELECT max(p.paid_at) FROM payments p WHERE p.application_id = a.id AND p.payment_status = 'paid')) AS paid_at
       FROM applications a JOIN contacts c ON c.id = a.contact_id
      WHERE ${JOINED_WHERE}
      ORDER BY a.membership_start_date DESC, a.created_at DESC`,
    [d]
  );
  // 带会员标识、但不在这个数里的人：会籍有效（「客户」页会员口径），却没有一条“这段时间开始、已缴费”的申请
  const { rows: others } = await pool.query<{ id: string; start: string | null; until: string; payment_status: string; application_status: string }>(
    `SELECT DISTINCT ON (c.id) c.id, a.membership_start_date::text AS start, a.membership_end_date::text AS until, a.payment_status, a.application_status
       FROM contacts c JOIN applications a ON a.contact_id = c.id
      WHERE c.merged_into IS NULL AND ${realContact('c')} AND a.membership_end_date >= current_date
        AND (a.application_status IN ('approved','paid','second_payment_due') OR (a.application_status = 'under_review' AND a.payment_status IN ('paid','partially_paid')))
        AND NOT EXISTS (SELECT 1 FROM applications a2 WHERE a2.contact_id = c.id AND a2.id = ANY($1::uuid[]))
      ORDER BY c.id, a.membership_end_date DESC`,
    [rows.map((r) => r.id)]
  );
  const p = await people(Array.from(new Set([...rows.map((r) => r.contact_id), ...others.map((o) => o.id)])));
  return {
    joined: rows.map((r) => ({
      ...p.get(r.contact_id)!, applicationId: r.id, startDate: r.start, tierName: r.tier_name, paidCents: r.paid, paidAt: r.paid_at?.toISOString() ?? null,
      method: r.method ? METHOD[r.method] ?? '其他' : r.plan === 'offline' ? '线下（没记具体方式）' : '方式没记录',
      plan: r.plan === 'semiAnnual' ? '分两期' : r.plan === 'annual' ? '一次缴清' : null
    })),
    otherMembers: others.map((o) => ({
      ...p.get(o.id)!, startDate: o.start, memberUntil: o.until,
      reason: !['paid', 'partially_paid'].includes(o.payment_status)
        ? '没有缴费记录（手动 / 线下标的会员）'
        : !o.start ? '会籍开始日期没填' : `会籍 ${o.start} 开始，不在这段时间`
    }))
  };
}

/** 第 4 个问题：key = f:<功能> 或 c:<渠道码> */
async function listBringer(d: number, key: string) {
  const pool = getPool();
  let label = '';
  let match: { channels?: string[]; companion?: boolean };
  if (key.startsWith('f:')) {
    const f = FEATURES.find((x) => x.key === key.slice(2));
    if (!f?.brings) throw new CrmError('not_found', '没有这个功能');
    const chans = f.brings.channelsTable ? (await pool.query<{ code: string }>(`SELECT code FROM channels`)).rows.map((c) => c.code) : (f.brings.channels ?? []);
    match = { channels: chans, companion: f.brings.companion };
    label = `${f.label.replace('首页入口 · ', '')}（功能）`;
  } else if (key.startsWith('c:')) {
    const { rows } = await pool.query<{ code: string; name: string }>(`SELECT code, name FROM channels WHERE code = $1`, [key.slice(2)]);
    if (!rows[0]) throw new CrmError('not_found', '没有这个渠道');
    match = { channels: [rows[0].code] };
    label = `${rows[0].name}（渠道）`;
  } else throw new CrmError('bad_request', '要看哪个功能或渠道？');
  const rows = await funnelPeople(pool, match, { days: d });
  const p = await people(rows.map((r) => r.contact_id));
  return {
    label,
    registered: rows.length, arrived: rows.filter((r) => r.arrived).length, joined: rows.filter((r) => r.joined).length,
    people: rows.map((r) => ({ ...p.get(r.contact_id)!, firstRegAt: r.first_at.toISOString(), arrived: r.arrived, joined: r.joined }))
  };
}

async function listVisitors(d: number) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; real: boolean }>(
    `WITH a AS (
       SELECT t.contact_id FROM track_events t WHERE t.contact_id IS NOT NULL AND t.created_at > now() - make_interval(days => $1)
       UNION SELECT s.contact_id FROM sessions s WHERE s.created_at > now() - make_interval(days => $1) OR s.last_seen_at > now() - make_interval(days => $1))
     SELECT DISTINCT c.id, (coalesce(nullif(trim(c.name), ''), '微信用户') <> '微信用户' OR c.phone_e164 IS NOT NULL OR c.email IS NOT NULL) AS real
       FROM a JOIN contacts c ON c.id = a.contact_id WHERE c.merged_into IS NULL AND ${realContact('c')}`,
    [d]
  );
  const ids = rows.map((r) => r.id);
  const [p, act] = await Promise.all([people(ids), activity(ids, d)]);
  const byLast = (x: { lastAt: string | null }, y: { lastAt: string | null }) => (y.lastAt ?? '').localeCompare(x.lastAt ?? '');
  const registered = rows.filter((r) => r.real).map((r) => ({ ...p.get(r.id)!, ...(act.get(r.id) ?? NO_ACT) })).sort(byLast);
  const unregistered = rows.filter((r) => !r.real).map((r) => ({ id: r.id, memberNo: p.get(r.id)!.memberNo, source: p.get(r.id)!.source, createdAt: p.get(r.id)!.createdAt, ...(act.get(r.id) ?? NO_ACT) })).sort(byLast);
  // 网站上没登录的访客：只有浏览器里的一个匿名标识，没有任何个人信息
  const { rows: anon } = await pool.query<{ n: number }>(
    `SELECT count(DISTINCT visitor)::int AS n FROM track_events WHERE contact_id IS NULL AND visitor IS NOT NULL AND created_at > now() - make_interval(days => $1)`, [d]);
  return { registered, unregistered, anonymousWeb: anon[0].n };
}

export async function dataPeople(list: string, days: number, key?: string | null) {
  const d = clampDays(days);
  switch (list as ListKind) {
    case 'new': return { list, days: d, ...(await listNew(d)) };
    case 'shells': return { list, days: d, ...(await listShells(d)) };
    case 'arrived': return { list, days: d, ...(await listArrived(d)) };
    case 'joined': return { list, days: d, ...(await listJoined(d)) };
    case 'bringer': return { list, days: d, ...(await listBringer(d, String(key ?? ''))) };
    case 'visitors': return { list, days: d, ...(await listVisitors(d)) };
    default: throw new CrmError('bad_request', '要看哪个名单？');
  }
}

// ── 导出表格（工作人员；记操作记录）─────────────────────────────────────

const cell = (v: unknown) => {
  const s = v == null ? '' : Array.isArray(v) ? v.join('；') : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const la = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('zh-CN', { timeZone: 'America/Los_Angeles', hour12: false }) : '');
const yes = (b: boolean) => (b ? '是' : '否');
const money = (c: number | null | undefined) => (c == null ? '' : `$${(c / 100).toFixed(2)}`);

export const LIST_TITLE: Record<ListKind, string> = { new: '新人', shells: '只打开过没登记', arrived: '到场', joined: '入会', bringer: '功能渠道带来的人', visitors: '这段时间谁来过' };

export async function exportDataPeopleCsv(s: Staff, list: string, days: number, key?: string | null): Promise<{ csv: string; filename: string }> {
  const r = (await dataPeople(list, days, key)) as Record<string, unknown> & { list: ListKind; days: number };
  const base = ['会员编号', '姓名', '手机', '邮箱', '行业', '公司', '哪天来的', '从哪来的', '来了以后做了什么', '是不是会员'];
  const pr = (x: Person) => [x.memberNo, x.name ?? '（没留姓名）', x.phone, x.email, x.industry, x.company, la(x.createdAt), x.source, x.did, x.isMember ? (x.tierName && x.tierName !== '会员' ? `会员 · ${x.tierName}` : '会员') : '否'];
  let head: string[] = [];
  let lines: unknown[][] = [];
  if (r.list === 'new') {
    head = base;
    lines = (r.people as Person[]).map(pr);
  } else if (r.list === 'shells') {
    head = ['档案编号', '第一次打开', '最近一次', '来过几天', '用的哪一端', '从哪来的', '点过的功能'];
    lines = (r.people as { memberNo: number; firstAt: string; lastAt: string; days: number; clients: string[]; source: string; top: string[] }[]).map((x) => [x.memberNo, la(x.firstAt), la(x.lastAt), x.days, x.clients, x.source, x.top]);
  } else if (r.list === 'arrived') {
    head = ['活动', '活动时间', ...base, '第一次来还是回头客'];
    for (const g of r.events as { title: string; startsAt: string; people: (Person & { firstTime: boolean; nth: number })[] }[])
      for (const x of g.people) lines.push([g.title, la(g.startsAt), ...pr(x), x.firstTime ? '第一次来' : `回头客（第 ${x.nth} 次）`]);
  } else if (r.list === 'joined') {
    head = ['类别', ...base, '会籍开始', '等级', '交了多少', '怎么交的', '说明'];
    for (const x of r.joined as (Person & { startDate: string; tierName: string | null; paidCents: number | null; method: string; plan: string | null })[])
      lines.push(['这段时间入会', ...pr(x), x.startDate, x.tierName, money(x.paidCents), x.method + (x.plan ? `（${x.plan}）` : ''), '']);
    for (const x of r.otherMembers as (Person & { startDate: string | null; reason: string })[]) lines.push(['带会员标识、不在这个数里', ...pr(x), x.startDate, x.tierName, '', '', x.reason]);
  } else if (r.list === 'bringer') {
    head = ['功能 / 渠道', ...base, '经它报名的时间', '到场', '入会'];
    lines = (r.people as (Person & { firstRegAt: string; arrived: boolean; joined: boolean })[]).map((x) => [r.label, ...pr(x), la(x.firstRegAt), yes(x.arrived), yes(x.joined)]);
  } else if (r.list === 'visitors') {
    head = ['类别', '会员编号', '姓名', '手机', '邮箱', '行业', '公司', '从哪来的', '是不是会员', '最近一次来', '来过几天', '用的哪一端', '主要看了什么'];
    for (const x of r.registered as (Person & Activity)[]) lines.push(['登记过', x.memberNo, x.name, x.phone, x.email, x.industry, x.company, x.source, x.isMember ? '会员' : '否', la(x.lastAt), x.days, x.clients, x.top]);
    for (const x of r.unregistered as ({ memberNo: number; source: string } & Activity)[]) lines.push(['未登记', x.memberNo, '（没留姓名）', '', '', '', '', x.source, '否', la(x.lastAt), x.days, x.clients, x.top]);
  }
  await audit(getPool(), s, 'export_data_people', 'data', r.list, { after: { list: r.list, days: r.days, key: key ?? null, count: lines.length } });
  const csv = '﻿' + [head.map(cell).join(','), ...lines.map((l) => l.map(cell).join(','))].join('\r\n');
  return { csv, filename: `sarec-data-${r.list}-${r.days}d-${new Date().toISOString().slice(0, 10)}.csv` };
}
