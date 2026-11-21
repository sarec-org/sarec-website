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
export type HomeEntry = { slot: number; label: string; icon: string | null; target: { type: 'trade' | 'group'; key: string }; pinned: boolean };

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
export async function loadHomeEntries(db: Db = getPool()): Promise<HomeEntry[]> {
  const { rows } = await db.query<{ slot: number; label: string; icon: string | null; target_type: 'trade' | 'group'; target_key: string; pinned: boolean }>(
    `SELECT slot, label, icon, target_type, target_key, pinned FROM jobs_home_entries ORDER BY sort, slot`
  );
  return rows.map((r) => ({ slot: r.slot, label: r.label, icon: r.icon, target: { type: r.target_type, key: r.target_key }, pinned: r.pinned === true }));
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
  if (!Array.isArray(list) || list.length !== 7) throw new CrmError('bad_request', '首页入口必须正好 7 个');
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
    return { slot: i + 1, label, icon, type, key, pinned };
  });
  for (const e of clean) {
    await pool.query(
      `INSERT INTO jobs_home_entries (slot, label, icon, target_type, target_key, sort, updated_by, pinned) VALUES ($1,$2,$3,$4,$5,$1,$6,$7)
       ON CONFLICT (slot) DO UPDATE SET label=$2, icon=$3, target_type=$4, target_key=$5, sort=$1, updated_by=$6, pinned=$7, updated_at=now()`,
      [e.slot, e.label, e.icon, e.type, e.key, actor, e.pinned]
    );
  }
  await pool.query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value) VALUES ($1, 'jobs_home_entries', 'jobs_home_entries', 'all', $2)`, [actor, JSON.stringify(clean)]);
  return loadHomeEntries(pool);
}
