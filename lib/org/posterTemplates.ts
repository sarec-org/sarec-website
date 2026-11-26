/**
 * 1.7.0 海报模板库（迁移 0053）。
 * ------------------------------------------------------------------
 * - 小程序「出海报」先选模板：GET /api/v1/poster-templates 给清单（只给上架的分类和模板），图片走本站
 *   /api/v1/poster-img/<id>/<version>/{t,l}.jpg（小程序只认本站域名；地址带版本号，换图后自动换新）。
 * - 主办方发布 / 改活动时可选一张模板（org_events.poster_tpl），出海报时服务器把字印在模板的信息位（box）上。
 * - 后台（/zh/staff/poster-templates）：上传 / 换图 / 下架 / 恢复 / 上下移 / 改分类 / 改名；「传自己的海报」开关。全部记 crm_audit_log。
 * - 图存 Vercel Blob：poster-templates/<分类>/<编号>_{t,l}_v<版本>.jpg（不加随机后缀；正式站和测试站共用同一批模板图）。
 */
import { randomBytes } from 'node:crypto';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { getPool, withTransaction } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { getSetting, setSetting } from '@/lib/crm/orders';
import { audit } from '@/lib/crm/staff';
import type { Staff } from '@/lib/crm/auth';
import type { Db } from '@/lib/crm/profile';

export const UPLOAD_ON_KEY = 'poster_upload_on';
/** 第一批老图（没有 box）出图时的默认信息位：画面下部 */
export const DEFAULT_BOX: [number, number, number, number] = [0.06, 0.7, 0.94, 0.95];
export const LARGE = { w: 1080, h: 1620 };
export const THUMB = { w: 300, h: 450 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PosterCategory = { key: string; name: string; tier: number; sort: number; active: boolean; updated_at: Date | null };
export type PosterTemplate = {
  id: string; code: string | null; category_key: string; name: string; image_url: string; thumb_url: string;
  box: number[] | null; ink: string | null; layout: number; sort: number; status: 'active' | 'hidden'; source: string | null;
  version: number; uses: number; created_at: Date; updated_at: Date;
};

export const blobPath = (category: string, code: string, size: 't' | 'l', version: number) => `poster-templates/${category}/${code}_${size}_v${version}.jpg`;
export const imgUrl = (base: string, id: string, version: number, size: 't' | 'l') => `${base.replace(/\/$/, '')}/api/v1/poster-img/${id}/${version}/${size}.jpg`;

/** 「传自己的海报」开关（默认关） */
export const uploadOn = (db: Db = getPool()) => getSetting<boolean>(db, UPLOAD_ON_KEY, false).then((v) => v === true);

// ── 小程序清单（不要求登录） ─────────────────────────────────────────
export async function publicList(base: string) {
  const pool = getPool();
  const { rows: cats } = await pool.query<PosterCategory>(`SELECT * FROM poster_categories WHERE active ORDER BY tier, sort, key`);
  const { rows: tpls } = await pool.query<PosterTemplate>(
    `SELECT t.* FROM poster_templates t JOIN poster_categories c ON c.key = t.category_key
      WHERE t.status = 'active' AND c.active ORDER BY t.sort, t.created_at`
  );
  const { rows: v } = await pool.query<{ ms: string | null }>(`SELECT (extract(epoch FROM max(updated_at)) * 1000)::bigint::text AS ms FROM poster_templates`);
  const by = new Map<string, PosterTemplate[]>();
  for (const t of tpls) by.set(t.category_key, [...(by.get(t.category_key) ?? []), t]);
  return {
    version: Number(v[0]?.ms ?? 0),
    uploadOn: await uploadOn(pool),
    categories: cats
      .filter((c) => by.get(c.key)?.length)
      .map((c) => ({
        key: c.key, name: c.name, tier: c.tier,
        items: (by.get(c.key) ?? []).map((t) => ({ id: t.id, name: t.name, thumb: imgUrl(base, t.id, t.version, 't'), large: imgUrl(base, t.id, t.version, 'l'), layout: t.layout }))
      }))
  };
}

export async function getTemplate(id: string, db: Db = getPool()): Promise<PosterTemplate | null> {
  if (!UUID.test(id)) return null;
  const { rows } = await db.query<PosterTemplate>(`SELECT * FROM poster_templates WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** 发布 / 改活动时选的模板：不传 / 空 = 不用模板；传了就必须存在且上架（分类也上架） */
export async function checkTemplateForEvent(raw: unknown, db: Db = getPool()): Promise<string | null> {
  if (raw == null || raw === '') return null;
  const id = String(raw).trim();
  if (!UUID.test(id)) throw new CrmError('bad_request', '选的海报模板不对，请重新选一张');
  const { rows } = await db.query<{ id: string }>(
    `SELECT t.id FROM poster_templates t JOIN poster_categories c ON c.key = t.category_key WHERE t.id = $1 AND t.status = 'active' AND c.active`,
    [id]
  ).catch(() => ({ rows: [] as { id: string }[] }));
  if (!rows[0]) throw new CrmError('bad_request', '这张海报模板已经下架了，请换一张');
  return rows[0].id;
}

/** 从 Blob 取模板图（大图 l / 小图 t） */
export async function fetchTemplateImage(t: Pick<PosterTemplate, 'image_url' | 'thumb_url'>, size: 't' | 'l'): Promise<Buffer> {
  const url = size === 't' ? t.thumb_url : t.image_url;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`模板图取不到（${res.status}）`);
  return Buffer.from(await res.arrayBuffer());
}

// ── 后台 ─────────────────────────────────────────────────────────────
export async function staffList() {
  const pool = getPool();
  const { rows: categories } = await pool.query<PosterCategory>(`SELECT * FROM poster_categories ORDER BY tier, sort, key`);
  const { rows: templates } = await pool.query<PosterTemplate>(`SELECT * FROM poster_templates ORDER BY category_key, sort, created_at`);
  return {
    categories,
    templates: templates.map((t) => ({ ...t, thumb: imgUrl('', t.id, t.version, 't'), large: imgUrl('', t.id, t.version, 'l') })),
    uploadOn: await uploadOn(pool)
  };
}

/** 上传的图统一裁成 2:3：大图 1080×1620、小图 300×450（居中裁切，转正方向） */
async function makeImages(input: Buffer): Promise<{ large: Buffer; thumb: Buffer }> {
  const meta = await sharp(input, { failOn: 'none' }).metadata().catch(() => null);
  if (!meta?.width || !meta?.height) throw new CrmError('bad_request', '这不是能识别的图片，请换一张（JPG / PNG）');
  if (meta.width < 600 || meta.height < 900) throw new CrmError('bad_request', `图片太小（${meta.width}×${meta.height}），至少 600×900，最好 1024×1536 或更大的竖图`);
  const large = await sharp(input, { failOn: 'none' }).rotate().resize(LARGE.w, LARGE.h, { fit: 'cover', position: 'centre' }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const thumb = await sharp(large).resize(THUMB.w, THUMB.h, { fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  return { large, thumb };
}

async function putImages(category: string, code: string, version: number, imgs: { large: Buffer; thumb: Buffer }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  const opt = { access: 'public' as const, contentType: 'image/jpeg', addRandomSuffix: false };
  const [l, t] = await Promise.all([
    put(blobPath(category, code, 'l', version), imgs.large, opt),
    put(blobPath(category, code, 't', version), imgs.thumb, opt)
  ]);
  return { imageUrl: l.url, thumbUrl: t.url };
}

const txt = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const INK = /^#[0-9a-f]{6}$/i;

async function mustCategory(db: Db, key: string): Promise<PosterCategory> {
  const { rows } = await db.query<PosterCategory>(`SELECT * FROM poster_categories WHERE key = $1`, [key]);
  if (!rows[0]) throw new CrmError('bad_request', '请选分类');
  return rows[0];
}
async function mustTemplate(db: Db, id: string): Promise<PosterTemplate> {
  const t = await getTemplate(id, db);
  if (!t) throw new CrmError('not_found', '找不到这张模板');
  return t;
}

/** 上传新模板：排在这个分类最后，默认上架 */
export async function uploadNew(s: Staff, f: { category: string; name: string; file: Buffer; box?: unknown; ink?: unknown }) {
  const pool = getPool();
  const cat = await mustCategory(pool, txt(f.category, 40));
  const name = txt(f.name, 30);
  if (!name) throw new CrmError('bad_request', '请给模板起个名字（30 字以内）');
  const imgs = await makeImages(f.file);
  const code = `${cat.key}-U${randomBytes(4).toString('hex')}`;
  const urls = await putImages(cat.key, code, 1, imgs);
  const box = parseBox(f.box);
  const ink = typeof f.ink === 'string' && INK.test(f.ink) ? f.ink : null;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO poster_templates (code, category_key, name, image_url, thumb_url, box, ink, layout, sort, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, (SELECT coalesce(max(sort), 0) + 1 FROM poster_templates WHERE category_key = $2), '后台上传') RETURNING id`,
    [code, cat.key, name, urls.imageUrl, urls.thumbUrl, box ? JSON.stringify(box) : null, ink]
  );
  await audit(pool, s, 'poster_tpl_upload', 'poster_template', rows[0].id, { after: { code, category: cat.key, name } });
  return { id: rows[0].id, message: `已上传「${name}」到「${cat.name}」，小程序 1 分钟内能看到` };
}

/** 换图：版本 +1（图片地址跟着变，小程序和缓存自动换新） */
export async function replaceImage(s: Staff, id: string, file: Buffer) {
  const pool = getPool();
  const t = await mustTemplate(pool, id);
  const imgs = await makeImages(file);
  const version = t.version + 1;
  const code = t.code ?? t.id;
  const urls = await putImages(t.category_key, code, version, imgs);
  await pool.query(`UPDATE poster_templates SET image_url = $2, thumb_url = $3, version = $4, updated_at = now() WHERE id = $1`, [t.id, urls.imageUrl, urls.thumbUrl, version]);
  await audit(pool, s, 'poster_tpl_replace', 'poster_template', t.id, { before: { version: t.version, image: t.image_url }, after: { version, image: urls.imageUrl } });
  return { message: `已换图「${t.name}」（第 ${version} 版）` };
}

export function parseBox(v: unknown): number[] | null {
  if (v == null || v === '') return null;
  let a = v;
  if (typeof v === 'string') { try { a = JSON.parse(v); } catch { return null; } }
  if (!Array.isArray(a) || a.length !== 4) return null;
  const n = a.map(Number);
  if (n.some((x) => !Number.isFinite(x) || x < 0 || x > 1)) return null;
  if (n[2] - n[0] < 0.2 || n[3] - n[1] < 0.1) return null;
  return n.map((x) => Math.round(x * 10000) / 10000);
}

/** 后台的各种小改动：下架 / 恢复 / 上下移 / 改分类 / 改名 */
export async function staffAction(s: Staff, b: Record<string, unknown>) {
  const action = String(b.action ?? '');
  if (action === 'set_upload_on') {
    const on = b.on === true;
    const pool = getPool();
    const before = await uploadOn(pool);
    await setSetting(pool, UPLOAD_ON_KEY, on, s.name || s.email);
    await audit(pool, s, 'poster_upload_on', 'setting', UPLOAD_ON_KEY, { before, after: on });
    return { message: on ? '已打开「传自己的海报」' : '已关掉「传自己的海报」' };
  }
  const id = String(b.id ?? '');
  return withTransaction(async (db) => {
    const t = await mustTemplate(db, id);
    if (action === 'hide' || action === 'show') {
      const status = action === 'hide' ? 'hidden' : 'active';
      await db.query(`UPDATE poster_templates SET status = $2, updated_at = now() WHERE id = $1`, [t.id, status]);
      await audit(db, s, action === 'hide' ? 'poster_tpl_hide' : 'poster_tpl_show', 'poster_template', t.id, { before: t.status, after: status });
      return { message: action === 'hide' ? `已下架「${t.name}」（已经选了它的活动照常能出图）` : `已恢复「${t.name}」` };
    }
    if (action === 'up' || action === 'down') {
      // 同一分类里按现在的顺序重新编号，再和相邻的一张对调
      const { rows } = await db.query<{ id: string }>(`SELECT id FROM poster_templates WHERE category_key = $1 ORDER BY sort, created_at FOR UPDATE`, [t.category_key]);
      const ids = rows.map((r) => r.id);
      const i = ids.indexOf(t.id);
      const j = action === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= ids.length) return { message: action === 'up' ? '已经是第一张了' : '已经是最后一张了' };
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await db.query(`UPDATE poster_templates p SET sort = x.n, updated_at = CASE WHEN p.sort <> x.n THEN now() ELSE p.updated_at END
                        FROM unnest($1::uuid[]) WITH ORDINALITY AS x(id, n) WHERE p.id = x.id`, [ids]);
      await audit(db, s, 'poster_tpl_move', 'poster_template', t.id, { before: i + 1, after: j + 1 });
      return { message: `已${action === 'up' ? '上移' : '下移'}「${t.name}」` };
    }
    if (action === 'set_category') {
      const cat = await mustCategory(db, txt(b.category, 40));
      if (cat.key === t.category_key) return { message: '分类没变' };
      await db.query(`UPDATE poster_templates SET category_key = $2, sort = (SELECT coalesce(max(sort), 0) + 1 FROM poster_templates WHERE category_key = $2), updated_at = now() WHERE id = $1`, [t.id, cat.key]);
      await audit(db, s, 'poster_tpl_category', 'poster_template', t.id, { before: t.category_key, after: cat.key });
      return { message: `已把「${t.name}」挪到「${cat.name}」（排在最后）` };
    }
    if (action === 'rename') {
      const name = txt(b.name, 30);
      if (!name) throw new CrmError('bad_request', '名字不能空（30 字以内）');
      await db.query(`UPDATE poster_templates SET name = $2, updated_at = now() WHERE id = $1`, [t.id, name]);
      await audit(db, s, 'poster_tpl_rename', 'poster_template', t.id, { before: t.name, after: name });
      return { message: `已改名为「${name}」` };
    }
    throw new CrmError('bad_request', '请选择操作');
  });
}

// ── 导入（给测试站灌数据；正式库走双击文件里的 SQL） ─────────────────
type ImportCat = { key?: unknown; name?: unknown; tier?: unknown; sort?: unknown };
type ImportTpl = { code?: unknown; category_key?: unknown; name?: unknown; image_url?: unknown; thumb_url?: unknown; box?: unknown; ink?: unknown; layout?: unknown; sort?: unknown; source?: unknown };
const BLOB_URL = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/poster-templates\//i;

export async function importData(s: Staff, b: { categories?: ImportCat[]; templates?: ImportTpl[] }) {
  const cats = Array.isArray(b.categories) ? b.categories : [];
  const tpls = Array.isArray(b.templates) ? b.templates : [];
  if (cats.length > 200 || tpls.length > 2000) throw new CrmError('bad_request', '一次最多 200 个分类、2000 张模板');
  const int = (v: unknown, d: number) => (Number.isInteger(Number(v)) ? Number(v) : d);
  return withTransaction(async (db) => {
    let c = 0;
    let t = 0;
    for (const x of cats) {
      const key = txt(x.key, 40);
      const name = txt(x.name, 20);
      if (!/^[a-z0-9_-]+$/.test(key) || !name) throw new CrmError('bad_request', `分类「${key || name}」的 key / 名字不对`);
      const r = await db.query(`INSERT INTO poster_categories (key, name, tier, sort) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING`, [key, name, int(x.tier, 3), int(x.sort, 0)]);
      c += r.rowCount ?? 0;
    }
    for (const x of tpls) {
      const code = txt(x.code, 60);
      const imageUrl = txt(x.image_url, 500);
      const thumbUrl = txt(x.thumb_url, 500);
      if (!code || !txt(x.name, 30) || !BLOB_URL.test(imageUrl) || !BLOB_URL.test(thumbUrl)) throw new CrmError('bad_request', `模板「${code}」缺编号 / 名字，或图片不是 poster-templates 下的 Blob 地址`);
      const box = parseBox(x.box);
      const r = await db.query(
        `INSERT INTO poster_templates (code, category_key, name, image_url, thumb_url, box, ink, layout, sort, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (code) DO NOTHING`,
        [code, txt(x.category_key, 40), txt(x.name, 30), imageUrl, thumbUrl, box ? JSON.stringify(box) : null,
          typeof x.ink === 'string' && INK.test(x.ink) ? x.ink : null, int(x.layout, 1), int(x.sort, 0), txt(x.source, 40) || null]
      );
      t += r.rowCount ?? 0;
    }
    await audit(db, s, 'poster_tpl_import', 'poster_template', 'import', { after: { categories: c, templates: t, sent: { categories: cats.length, templates: tpls.length } } });
    return { categories: c, templates: t, message: `新加 ${c} 个分类、${t} 张模板（已有的编号跳过）` };
  });
}
