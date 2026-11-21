/**
 * 找工人 · 接活儿：城市（jobs_cities，后台增删改、排序，不用发版）。
 * 发活儿、登记接活、所有城市筛选、派活匹配都用这一张表。记录里存 key，改名不影响历史；用过的城市“删除”= 停用。
 */
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import type { Db } from '@/lib/crm/profile';

export type City = { key: string; name: string; region: string; regionSort: number; sort: number; enabled: boolean };
type Row = { key: string; name: string; region: string; region_sort: number; sort: number; enabled: boolean };

export async function loadCities(db: Db = getPool(), opts: { all?: boolean } = {}): Promise<City[]> {
  const { rows } = await db.query<Row>(
    `SELECT key, name, region, region_sort, sort, enabled FROM jobs_cities WHERE ($1 OR enabled) ORDER BY region_sort, region, sort, name`,
    [!!opts.all]
  );
  return rows.map((r) => ({ key: r.key, name: r.name, region: r.region, regionSort: r.region_sort, sort: r.sort, enabled: r.enabled }));
}

/** meta 用：按地区分组的启用城市 */
export function groupCities(list: City[]): { region: string; items: { key: string; name: string }[] }[] {
  const out: { region: string; items: { key: string; name: string }[] }[] = [];
  for (const c of list) {
    let g = out.find((x) => x.region === c.region);
    if (!g) out.push((g = { region: c.region, items: [] }));
    g.items.push({ key: c.key, name: c.name });
  }
  return out;
}

/** key → 名字（含停用的，老记录照样显示名字） */
export async function cityNames(db: Db = getPool()): Promise<Map<string, string>> {
  return new Map((await loadCities(db, { all: true })).map((c) => [c.key, c.name]));
}

/** 输入（key 或名字）→ 城市。新填的只认启用的；查询筛选也认停用的（老记录还能筛到）。 */
export async function resolveCity(db: Db, input: unknown, opts: { allowDisabled?: boolean } = {}): Promise<City | null> {
  if (typeof input !== 'string' || !input.trim()) return null;
  const v = input.trim();
  const list = await loadCities(db, { all: true });
  const c = list.find((x) => x.key === v) ?? list.find((x) => x.name === v);
  if (!c || (!c.enabled && !opts.allowDisabled)) return null;
  return c;
}
export async function resolveCities(db: Db, input: unknown): Promise<City[]> {
  const arr = Array.isArray(input) ? input : [];
  const out: City[] = [];
  for (const x of arr.slice(0, 40)) {
    const c = await resolveCity(db, x);
    if (!c) throw new CrmError('bad_request', `城市「${String(x).slice(0, 20)}」不在城市列表里，请从列表里选；列表里没有的请联系商会工作人员添加`);
    if (!out.some((y) => y.key === c.key)) out.push(c);
  }
  return out;
}

// ── 后台 ───────────────────────────────────────────────────────────────
export async function staffCities() {
  const pool = getPool();
  const list = await loadCities(pool, { all: true });
  const { rows: pu } = await pool.query<{ k: string; n: number }>(`SELECT unnest(cities) AS k, count(*)::int AS n FROM jobs_pros GROUP BY 1`);
  const { rows: po } = await pool.query<{ k: string; n: number }>(`SELECT city_key AS k, count(*)::int AS n FROM jobs_posts WHERE city_key IS NOT NULL GROUP BY 1`);
  const pros = new Map(pu.map((r) => [r.k, r.n]));
  const posts = new Map(po.map((r) => [r.k, r.n]));
  const regions: { region: string; regionSort: number; items: (City & { pros: number; posts: number })[] }[] = [];
  for (const c of list) {
    let g = regions.find((x) => x.region === c.region);
    if (!g) regions.push((g = { region: c.region, regionSort: c.regionSort, items: [] }));
    g.items.push({ ...c, pros: pros.get(c.key) ?? 0, posts: posts.get(c.key) ?? 0 });
  }
  return { regions };
}

const audit = (actor: string, action: string, key: string, after: unknown) =>
  getPool().query(`INSERT INTO crm_audit_log (actor, action, target_type, target_id, after_value) VALUES ($1, $2, 'jobs_city', $3, $4)`, [actor, action, key, JSON.stringify(after)]);

/** 新增或修改：{ key?（不给就新建）, name, region, enabled? } */
export async function upsertCity(b: Record<string, unknown>, actor: string): Promise<City> {
  const pool = getPool();
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 30) : '';
  const region = typeof b.region === 'string' ? b.region.trim().slice(0, 30) : '';
  if (!name) throw new CrmError('bad_request', '请填城市名');
  if (!region) throw new CrmError('bad_request', '请选或填地区');
  const key = typeof b.key === 'string' && b.key.trim() ? b.key.trim() : null;
  const { rows: dup } = await pool.query<{ key: string }>(`SELECT key FROM jobs_cities WHERE name = $1 AND ($2::text IS NULL OR key <> $2)`, [name, key]);
  if (dup[0]) throw new CrmError('conflict', `已经有「${name}」了`);
  if (key) {
    const { rows } = await pool.query<Row>(
      `UPDATE jobs_cities SET name = $2, region = $3, enabled = COALESCE($4, enabled),
          region_sort = CASE WHEN region = $3 THEN region_sort ELSE COALESCE((SELECT max(region_sort) FROM jobs_cities WHERE region = $3), (SELECT coalesce(max(region_sort), 0) + 10 FROM jobs_cities)) END,
          sort = CASE WHEN region = $3 THEN sort ELSE (SELECT coalesce(max(sort), 0) + 10 FROM jobs_cities WHERE region = $3) END,
          updated_by = $5, updated_at = now()
        WHERE key = $1 RETURNING key, name, region, region_sort, sort, enabled`,
      [key, name, region, typeof b.enabled === 'boolean' ? b.enabled : null, actor]
    );
    if (!rows[0]) throw new CrmError('not_found', '找不到这个城市');
    await audit(actor, 'jobs_city_save', key, rows[0]);
    const r = rows[0];
    return { key: r.key, name: r.name, region: r.region, regionSort: r.region_sort, sort: r.sort, enabled: r.enabled };
  }
  const newKey = `c_${randomBytes(4).toString('hex')}`;
  const { rows } = await pool.query<Row>(
    `INSERT INTO jobs_cities (key, name, region, region_sort, sort, enabled, updated_by)
     VALUES ($1, $2, $3,
       COALESCE((SELECT max(region_sort) FROM jobs_cities WHERE region = $3), (SELECT coalesce(max(region_sort), 0) + 10 FROM jobs_cities)),
       (SELECT coalesce(max(sort), 0) + 10 FROM jobs_cities WHERE region = $3), COALESCE($4, true), $5)
     RETURNING key, name, region, region_sort, sort, enabled`,
    [newKey, name, region, typeof b.enabled === 'boolean' ? b.enabled : null, actor]
  );
  await audit(actor, 'jobs_city_add', newKey, rows[0]);
  const r = rows[0];
  return { key: r.key, name: r.name, region: r.region, regionSort: r.region_sort, sort: r.sort, enabled: r.enabled };
}

/** 删除：有人登记过、有活儿用过的 → 只停用（不再出现在选项里，老记录照样显示）；没用过的 → 真删 */
export async function deleteCity(key: string, actor: string): Promise<{ key: string; deleted: boolean; disabled: boolean; message: string }> {
  const pool = getPool();
  const { rows: c } = await pool.query<{ name: string }>(`SELECT name FROM jobs_cities WHERE key = $1`, [key]);
  if (!c[0]) throw new CrmError('not_found', '找不到这个城市');
  const { rows: used } = await pool.query(
    `SELECT 1 FROM jobs_pros WHERE $1 = ANY(cities) UNION ALL SELECT 1 FROM jobs_posts WHERE city_key = $1 LIMIT 1`,
    [key]
  );
  if (used[0]) {
    await pool.query(`UPDATE jobs_cities SET enabled = false, updated_by = $2, updated_at = now() WHERE key = $1`, [key, actor]);
    await audit(actor, 'jobs_city_disable', key, { name: c[0].name });
    return { key, deleted: false, disabled: true, message: `「${c[0].name}」已经有人登记或发过活儿，已改成停用：不再出现在选项里，原来的记录照样显示` };
  }
  await pool.query(`DELETE FROM jobs_cities WHERE key = $1`, [key]);
  await audit(actor, 'jobs_city_delete', key, { name: c[0].name });
  return { key, deleted: true, disabled: false, message: `已删除「${c[0].name}」` };
}

/** 排序：{ regions: [{ region, keys: [...] }] }，地区顺序和地区内顺序都按数组；也可以把城市挪到别的地区 */
export async function reorderCities(b: Record<string, unknown>, actor: string) {
  const regions = Array.isArray(b.regions) ? b.regions : [];
  if (!regions.length) throw new CrmError('bad_request', '没有要排序的城市');
  const pool = getPool();
  const known = new Set((await loadCities(pool, { all: true })).map((c) => c.key));
  let i = 0;
  for (const g of regions) {
    const o = (g ?? {}) as { region?: unknown; keys?: unknown };
    const region = typeof o.region === 'string' ? o.region.trim().slice(0, 30) : '';
    const keys = Array.isArray(o.keys) ? o.keys.filter((k): k is string => typeof k === 'string' && known.has(k)) : [];
    if (!region) throw new CrmError('bad_request', '地区名不能为空');
    i++;
    let j = 0;
    for (const k of keys) {
      j++;
      await pool.query(`UPDATE jobs_cities SET region = $2, region_sort = $3, sort = $4, updated_by = $5, updated_at = now() WHERE key = $1`, [k, region, i * 10, j * 10, actor]);
    }
  }
  await audit(actor, 'jobs_city_reorder', 'all', regions);
  return staffCities();
}
