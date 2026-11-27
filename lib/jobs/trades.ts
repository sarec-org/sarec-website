/** 工种、分组、首页入口（资质表）。后台可增删改。 */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import type { Db } from '@/lib/crm/profile';

export type Trade = {
  key: string; name: string; group: string; licType: 'A' | 'B' | 'C'; issuer: string | null; licenseClass: string | null;
  lookupUrl: string | null; verifyPoints: string | null; open: boolean; noPost: boolean; noNotify: boolean; sort: number; verified: boolean; note: string | null; icon: string | null;
};
export type Group = { key: string; name: string; order: number };
/** pinned（D29）：常显——不管有没有核验通过的人都在首页显示（没人时标“招募中”） */
export type HomeEntry = { slot: number; label: string; icon: string | null; target: { type: 'trade' | 'group'; key: string }; pinned: boolean; showOn?: ('find' | 'work')[]; workSort?: number | null };

type TradeRow = {
  key: string; name: string; group_key: string; lic_type: 'A' | 'B' | 'C'; issuer: string | null; license_class: string | null; lookup_url: string | null;
  verify_points: string | null; open: boolean; no_post: boolean; no_notify: boolean; sort: number; verified: boolean; note: string | null; icon: string | null;
};
const toTrade = (r: TradeRow): Trade => ({
  key: r.key, name: r.name, group: r.group_key, licType: r.lic_type, issuer: r.issuer, licenseClass: r.license_class, lookupUrl: r.lookup_url,
  verifyPoints: r.verify_points, open: r.open, noPost: r.no_post, noNotify: r.no_notify, sort: r.sort, verified: r.verified, note: r.note, icon: r.icon
});

export async function loadTrades(db: Db = getPool()): Promise<Trade[]> {
  const { rows } = await db.query<TradeRow>(
    `SELECT t.* FROM jobs_trades t JOIN jobs_trade_groups g ON g.key = t.group_key ORDER BY g.sort, t.sort, t.key`
  );
  return rows.map(toTrade);
}
export async function tradeMap(db: Db = getPool()): Promise<Map<string, Trade>> {
  return new Map((await loadTrades(db)).map((t) => [t.key, t]));
}
export async function loadGroups(db: Db = getPool()): Promise<Group[]> {
  const { rows } = await db.query<{ key: string; name: string; sort: number }>(`SELECT key, name, sort FROM jobs_trade_groups ORDER BY sort, key`);
  return rows.map((r) => ({ key: r.key, name: r.name, order: r.sort }));
}
export type Side = 'find' | 'work';
/**
 * 首页入口（找工人一侧的顺序 = sort）。指令 29：每个入口带 showOn（在哪一侧显示）、workSort（接活儿一侧的顺序，空 = 跟 sort 一样）。
 * 迁移 0046 还没跑的库（没有 show_on 列）：照旧读，showOn 当作两侧都有。
 */
export async function loadHomeEntries(db: Db = getPool()): Promise<HomeEntry[]> {
  type Row = { slot: number; label: string; icon: string | null; target_type: 'trade' | 'group'; target_key: string; pinned: boolean; sort: number; show_on?: string[] | null; work_sort?: number | null };
  const { rows } = await db
    .query<Row>(`SELECT slot, label, icon, target_type, target_key, pinned, sort, show_on, work_sort FROM jobs_home_entries ORDER BY sort, slot`)
    .catch(() => db.query<Row>(`SELECT slot, label, icon, target_type, target_key, pinned, sort FROM jobs_home_entries ORDER BY sort, slot`));
  return rows.map((r) => ({
    slot: r.slot, label: r.label, icon: r.icon, target: { type: r.target_type, key: r.target_key }, pinned: r.pinned === true,
    showOn: (Array.isArray(r.show_on) && r.show_on.length ? r.show_on : ['find', 'work']).filter((x): x is Side => x === 'find' || x === 'work'),
    workSort: r.work_sort ?? null
  }));
}
/** 找工人一侧（homeEntries）：show_on 有 find 的，按 sort */
export function findSideEntries(all: HomeEntry[]): HomeEntry[] {
  return all.filter((e) => (e.showOn ?? ['find', 'work']).includes('find'));
}
/** 接活儿一侧（workEntries）：show_on 有 work 的，按 work_sort（家政保洁 0 排第一），同序按 sort */
export function workSideEntries(all: HomeEntry[]): HomeEntry[] {
  return all
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (e.showOn ?? ['find', 'work']).includes('work'))
    // 没单独排过的按找工人一侧的顺序（第几个，从 1 起）；家政保洁 work_sort = 0 排最前
    .sort((a, b) => (a.e.workSort ?? a.i + 1) - (b.e.workSort ?? b.i + 1) || a.i - b.i)
    .map(({ e }) => e);
}

/** 有核验通过、上了列表的人（不算工人）的工种 */
export async function tradesWithPros(db: Db = getPool()): Promise<Set<string>> {
  const { rows } = await db.query<{ k: string }>(
    `SELECT DISTINCT unnest(verified_trades) AS k FROM jobs_pros WHERE listed AND role <> 'worker'`
  );
  return new Set(rows.map((r) => r.k));
}

// ── 后台：增删改 ───────────────────────────────────────────────────────
const s = (v: unknown, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : undefined);

export async function upsertTrade(b: Record<string, unknown>, actor: string): Promise<Trade> {
  const key = s(b.key, 40);
  if (!key || !/^[a-z][a-z0-9_]{1,39}$/.test(key)) throw new CrmError('bad_request', '工种编号只能用小写英文字母、数字和下划线');
  const pool = getPool();
  const { rows: ex } = await pool.query<TradeRow>(`SELECT * FROM jobs_trades WHERE key = $1`, [key]);
  const cur = ex[0];
  const name = s(b.name, 40) ?? cur?.name;
  const group = s(b.group, 40) ?? cur?.group_key;
  const lic = (s(b.licType, 1) ?? cur?.lic_type) as string | undefined;
  if (!name) throw new CrmError('bad_request', '请填工种名称');
  if (!group) throw new CrmError('bad_request', '请选分组');
  if (!lic || !['A', 'B', 'C'].includes(lic)) throw new CrmError('bad_request', '资质类型只能是 A、B、C');
  const { rows: g } = await pool.query(`SELECT 1 FROM jobs_trade_groups WHERE key = $1`, [group]);
  if (!g[0]) throw new CrmError('bad_request', '没有这个分组');
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const { rows } = await pool.query<TradeRow>(
    `INSERT INTO jobs_trades (key, name, group_key, lic_type, issuer, license_class, lookup_url, verify_points, open, no_post, no_notify, sort, verified, note, updated_by, icon, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
     ON CONFLICT (key) DO UPDATE SET name=$2, group_key=$3, lic_type=$4, issuer=$5, license_class=$6, lookup_url=$7, verify_points=$8,
       open=$9, no_post=$10, no_notify=$11, sort=$12, verified=$13, note=$14, updated_by=$15, icon=$16, updated_at=now()
     RETURNING *`,
    [
      key, name, group, lic,
      b.issuer !== undefined ? s(b.issuer) || null : cur?.issuer ?? null,
      b.licenseClass !== undefined ? s(b.licenseClass) || null : cur?.license_class ?? null,
      b.lookupUrl !== undefined ? s(b.lookupUrl, 500) || null : cur?.lookup_url ?? null,
      b.verifyPoints !== undefined ? s(b.verifyPoints, 2000) || null : cur?.verify_points ?? null,
      bool(b.open, cur?.open ?? false), bool(b.noPost, cur?.no_post ?? false), bool(b.noNotify, cur?.no_notify ?? false),
      typeof b.sort === 'number' ? Math.round(b.sort) : cur?.sort ?? 999,
      bool(b.verified, cur?.verified ?? false),
      b.note !== undefined ? s(b.note, 1000) || null : cur?.note ?? null,
      actor,
      b.icon !== undefined ? s(b.icon, 40) || null : cur?.icon ?? null
    ]
  );
  await pool.query(
    `INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value) VALUES ($1, 'jobs_trade_save', 'jobs_trade', $2, $3, $4)`,
    [actor, key, cur ? JSON.stringify(cur) : null, JSON.stringify(rows[0])]
  );
  return toTrade(rows[0]);
}

export async function deleteTrade(key: string, actor: string): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query(`SELECT 1 FROM jobs_posts WHERE trade_key = $1 LIMIT 1`, [key]);
  if (rows[0]) throw new CrmError('conflict', '这个工种下已经有活儿，不能删除；可以改成“不开放”');
  const { rows: h } = await pool.query(`SELECT 1 FROM jobs_home_entries WHERE target_type = 'trade' AND target_key = $1`, [key]);
  if (h[0]) throw new CrmError('conflict', '首页入口指向这个工种，请先把入口换掉');
  await pool.query(`DELETE FROM jobs_trades WHERE key = $1`, [key]);
  await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id) VALUES ($1, 'jobs_trade_delete', 'jobs_trade', $2)`, [actor, key]);
}

export async function upsertGroup(b: Record<string, unknown>, actor: string): Promise<Group> {
  const key = s(b.key, 40);
  const name = s(b.name, 40);
  if (!key || !/^[a-z][a-z0-9_]{1,39}$/.test(key)) throw new CrmError('bad_request', '分组编号只能用小写英文字母、数字和下划线');
  if (!name) throw new CrmError('bad_request', '请填分组名称');
  const sort = typeof b.order === 'number' ? Math.round(b.order) : 999;
  await getPool().query(
    `INSERT INTO jobs_trade_groups (key, name, sort, updated_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET name = $2, sort = $3, updated_by = $4, updated_at = now()`,
    [key, name, sort, actor]
  );
  return { key, name, order: sort };
}

/** 首页 7 个入口整体保存（顺序按数组） */
export async function saveHomeEntries(list: unknown, actor: string): Promise<HomeEntry[]> {
  // 指令 29：入口可以只在一侧显示，总数 1–7 个（原来必须正好 7 个）
  if (!Array.isArray(list) || list.length < 1 || list.length > 7) throw new CrmError('bad_request', '首页入口要有 1–7 个');
  const pool = getPool();
  const trades = await tradeMap(pool);
  const groups = new Set((await loadGroups(pool)).map((g) => g.key));
  const before = await loadHomeEntries(pool);
  const clean = list.map((x, i) => {
    const o = (x ?? {}) as { label?: unknown; icon?: unknown; pinned?: unknown; target?: { type?: unknown; key?: unknown } };
    const label = s(o.label, 12);
    const type = o.target?.type === 'group' ? 'group' : o.target?.type === 'trade' ? 'trade' : null;
    const key = s(o.target?.key, 40);
    if (!label) throw new CrmError('bad_request', `第 ${i + 1} 个入口没有名字`);
    if (!type || !key || (type === 'trade' ? !trades.has(key) : !groups.has(key))) throw new CrmError('bad_request', `第 ${i + 1} 个入口指向的工种或分组不存在`);
    // D29：没传 pinned（旧版调用方）就沿用这个入口原来的值（按指向的工种 / 分组找）
    const old = before.find((b) => b.target.type === type && b.target.key === key);
    const pinned = typeof o.pinned === 'boolean' ? o.pinned : old?.pinned ?? false;
    const icon = s(o.icon, 40) || old?.icon || null;
    // 指令 29：在哪一侧显示（找工人 / 接活儿，至少一侧）；不传沿用原值。接活儿一侧的顺序沿用原值
    const rawSide = (x as { showOn?: unknown }).showOn;
    const showOn = Array.isArray(rawSide) ? Array.from(new Set(rawSide.filter((v): v is Side => v === 'find' || v === 'work'))) : old?.showOn ?? ['find', 'work'];
    if (!showOn.length) throw new CrmError('bad_request', `第 ${i + 1} 个入口至少要在一侧显示（找工人一侧或接活儿一侧）`);
    return { slot: i + 1, label, icon, type, key, pinned, showOn, workSort: old?.workSort ?? null };
  });
  for (const e of clean) {
    await pool.query(
      `INSERT INTO jobs_home_entries (slot, label, icon, target_type, target_key, sort, updated_by, pinned, show_on, work_sort) VALUES ($1,$2,$3,$4,$5,$1,$6,$7,$8,$9)
       ON CONFLICT (slot) DO UPDATE SET label=$2, icon=$3, target_type=$4, target_key=$5, sort=$1, updated_by=$6, pinned=$7, show_on=$8, work_sort=$9, updated_at=now()`,
      [e.slot, e.label, e.icon, e.type, e.key, actor, e.pinned, e.showOn, e.workSort]
    );
  }
  // 少于 7 个时，多出来的位置删掉
  await pool.query(`DELETE FROM jobs_home_entries WHERE slot > $1`, [clean.length]);
  await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value) VALUES ($1, 'jobs_home_entries', 'jobs_home_entries', 'all', $2, $3)`, [actor, JSON.stringify(before), JSON.stringify(clean)]);
  return loadHomeEntries(pool);
}

// ── 指令 99：两侧首页各 8 个工种 ─────────────────────────────────────────
/**
 * 首页入口表（jobs_home_entries，后台「工种与资质表」里调，最多 7 个）分到两侧后，各自不满 8 个的，用"最常用的工种"补到 8 个。
 * - 补哪些：后台可指定（crm_settings.jobs_side_fill = { find?: [工种 key…], work?: [工种 key…] }，按顺序）；没指定的一侧自动选。
 * - 自动选：开放的工种里，有核验通过的人的在前 → 人多的在前 → 活儿多的在前 → 资质表原顺序。
 * - 不补重复的：已经是入口的工种不补；入口里有「一组」（如 装修 = 维修与装修组）时，这一组里的工种（如 油漆粉刷）不补；
 *   只在另一侧出现的组（如 家政保洁只在接活儿一侧）的工种，这一侧也不补。指定的工种也照这个规矩过滤。
 * - 老版本小程序只取前 7 个（utils/jobs.js slice(0, 7)），多给 1 个不影响。不加迁移。
 */
export const SIDE_FILL_KEY = 'jobs_side_fill';
export const SIDE_MAX = 8;
export type SideFill = { find?: string[] | null; work?: string[] | null };

export async function loadSideFill(db: Db = getPool()): Promise<SideFill> {
  const { getSetting } = await import('@/lib/crm/orders');
  const v = await getSetting<unknown>(db, SIDE_FILL_KEY, null);
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const list = (x: unknown) => (Array.isArray(x) ? x.filter((k): k is string => typeof k === 'string') : null);
  return { find: list(o.find), work: list(o.work) };
}

/** 每个工种的使用量：核验通过、上了列表的人数（不算工人）＋没下架的活儿数 */
export async function tradeUsage(db: Db = getPool()): Promise<Map<string, { pros: number; posts: number }>> {
  const [{ rows: p }, { rows: j }] = await Promise.all([
    db.query<{ k: string; n: number }>(`SELECT k, count(*)::int AS n FROM (SELECT unnest(verified_trades) AS k FROM jobs_pros WHERE listed AND role <> 'worker') x GROUP BY k`),
    db.query<{ k: string; n: number }>(`SELECT trade_key AS k, count(*)::int AS n FROM jobs_posts WHERE status <> 'removed' GROUP BY trade_key`)
  ]);
  const m = new Map<string, { pros: number; posts: number }>();
  for (const r of p) m.set(r.k, { pros: r.n, posts: 0 });
  for (const r of j) m.set(r.k, { pros: m.get(r.k)?.pros ?? 0, posts: r.n });
  return m;
}

const shortName = (n: string) => n.replace(/（[^）]*）|\([^)]*\)/g, '').trim() || n;

/** 这一侧可以用来补位的工种（按规矩过滤、按常用排好） */
export function sideCandidates(side: Side, all: HomeEntry[], trades: Trade[], usage: Map<string, { pros: number; posts: number }>): Trade[] {
  const other: Side = side === 'find' ? 'work' : 'find';
  const sideEntries = side === 'find' ? findSideEntries(all) : workSideEntries(all);
  const usedTrades = new Set(sideEntries.filter((e) => e.target.type === 'trade').map((e) => e.target.key));
  const usedGroups = new Set(sideEntries.filter((e) => e.target.type === 'group').map((e) => e.target.key));
  // 只在另一侧出现的入口：它的组（或它这个工种所在的组）这一侧不补
  const otherOnly = all.filter((e) => { const on = e.showOn ?? ['find', 'work']; return on.includes(other) && !on.includes(side); });
  const byKey = new Map(trades.map((t) => [t.key, t]));
  const blockedGroups = new Set(otherOnly.map((e) => (e.target.type === 'group' ? e.target.key : byKey.get(e.target.key)?.group ?? '')));
  const order = new Map(trades.map((t, i) => [t.key, i]));
  return trades
    .filter((t) => t.open && !usedTrades.has(t.key) && !usedGroups.has(t.group) && !blockedGroups.has(t.group))
    .sort((a, b) => {
      const ua = usage.get(a.key) ?? { pros: 0, posts: 0 };
      const ub = usage.get(b.key) ?? { pros: 0, posts: 0 };
      return Number(ub.pros > 0) - Number(ua.pros > 0) || ub.pros - ua.pros || ub.posts - ua.posts || (order.get(a.key)! - order.get(b.key)!);
    });
}

/** 这一侧最终的入口（≤ 8 个）：入口表里这一侧的 + 补位的工种；auto = 补位是不是自动选的 */
export function sideEntries8(side: Side, all: HomeEntry[], trades: Trade[], usage: Map<string, { pros: number; posts: number }>, fill: SideFill): { entries: HomeEntry[]; fill: string[]; auto: boolean } {
  const base = (side === 'find' ? findSideEntries(all) : workSideEntries(all)).slice(0, SIDE_MAX);
  const cands = sideCandidates(side, all, trades, usage);
  const pick = fill[side];
  const okKeys = new Set(cands.map((t) => t.key));
  const chosen = (pick ? pick.filter((k) => okKeys.has(k)).map((k) => cands.find((t) => t.key === k)!) : cands).slice(0, Math.max(0, SIDE_MAX - base.length));
  // 指定的不够数时，用自动的接着补
  if (pick && chosen.length < SIDE_MAX - base.length) for (const t of cands) if (chosen.length < SIDE_MAX - base.length && !chosen.includes(t)) chosen.push(t);
  const extra: HomeEntry[] = chosen.map((t, i) => ({
    slot: 100 + i, label: shortName(t.name), icon: t.icon, target: { type: 'trade', key: t.key }, pinned: false, showOn: [side], workSort: null
  }));
  return { entries: [...base, ...extra], fill: chosen.map((t) => t.key), auto: !pick };
}

/** 后台：指定两侧补位的工种（null = 这一侧改回自动）。记操作记录 */
export async function saveSideFill(b: { find?: unknown; work?: unknown }, actor: string): Promise<SideFill> {
  const pool = getPool();
  const trades = await tradeMap(pool);
  const clean = (v: unknown, side: string): string[] | null => {
    if (v == null) return null;
    if (!Array.isArray(v) || v.length > SIDE_MAX) throw new CrmError('bad_request', `${side}一侧最多选 ${SIDE_MAX} 个工种`);
    const ks = Array.from(new Set(v.map((x) => String(x))));
    const bad = ks.find((k) => !trades.get(k)?.open);
    if (bad) throw new CrmError('bad_request', `工种「${bad}」不存在或没开放`);
    return ks;
  };
  const before = await loadSideFill(pool);
  const after: SideFill = { find: clean(b.find, '找工人'), work: clean(b.work, '接活儿') };
  const { setSetting } = await import('@/lib/crm/orders');
  await setSetting(pool, SIDE_FILL_KEY, after, actor);
  await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, before_value, after_value) VALUES ($1, 'jobs_side_fill', 'setting', $2, $3, $4)`, [actor, SIDE_FILL_KEY, JSON.stringify(before), JSON.stringify(after)]);
  return after;
}
