/**
 * 1.7.0 海报模板库（迁移 0053）。
 * ------------------------------------------------------------------
 * - 小程序「出海报」先选模板：GET /api/v1/poster-templates 给清单（只给上架的分类和模板），图片走本站
 *   /api/v1/poster-img/<id>/<version>/{t,l}.jpg（小程序只认本站域名；地址带版本号，换图后自动换新）。
 * - 主办方发布 / 改活动时可选一张模板（org_events.poster_tpl），出海报时服务器把字印在模板的信息位（box）上。
 * - 后台（/zh/staff/poster-templates）：上传 / 换图 / 下架 / 恢复 / 上下移 / 改分类 / 改名；「传自己的海报」开关。全部记 crm_audit_log。
 * - 图存 Vercel Blob：poster-templates/<分类>/<编号>_{t,l}_v<版本>.jpg（不加随机后缀；正式站和测试站共用同一批模板图）。
 * - 迁移 0054（节日祝福）：分类和模板都有 purpose（'event' 办活动 / 'greeting' 节日祝福）。这里的小程序清单、发活动选模板只认 event；
 *   祝福的清单和出图在 lib/org/greetings.ts。模板的用途跟着分类走（上传、改分类时自动对齐）。祝福模板多一个落款位 sig_box，祝福分类多一个节日日期 festival_date。
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
import { festivalsAt, laToday } from './festivals';

export const UPLOAD_ON_KEY = 'poster_upload_on';
/** 第一批老图（没有 box）出图时的默认信息位：画面下部 */
export const DEFAULT_BOX: [number, number, number, number] = [0.06, 0.7, 0.94, 0.95];
export const LARGE = { w: 1080, h: 1620 };
export const THUMB = { w: 300, h: 450 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Purpose = 'event' | 'greeting';
export const PURPOSE_LABEL: Record<Purpose, string> = { event: '办活动', greeting: '节日祝福' };
export type PosterCategory = { key: string; name: string; tier: number; sort: number; active: boolean; updated_at: Date | null; purpose: Purpose; festival_date: string | null };
export type PosterTemplate = {
  id: string; code: string | null; category_key: string; name: string; image_url: string; thumb_url: string;
  box: number[] | null; ink: string | null; layout: number; sort: number; status: 'active' | 'hidden'; source: string | null;
  version: number; uses: number; created_at: Date; updated_at: Date; purpose: Purpose; sig_box: number[] | null;
};
/** 分类的列（festival_date 转成 'YYYY-MM-DD' 字符串，免得 date 被转成 JS 时间后差一天） */
export const CAT_COLS = (a = '') => `${a}key, ${a}name, ${a}tier, ${a}sort, ${a}active, ${a}updated_at, ${a}purpose, to_char(${a}festival_date, 'YYYY-MM-DD') AS festival_date`;

export const blobPath = (category: string, code: string, size: 't' | 'l', version: number) => `poster-templates/${category}/${code}_${size}_v${version}.jpg`;
export const imgUrl = (base: string, id: string, version: number, size: 't' | 'l') => `${base.replace(/\/$/, '')}/api/v1/poster-img/${id}/${version}/${size}.jpg`;

/** 「传自己的海报」开关（默认关） */
export const uploadOn = (db: Db = getPool()) => getSetting<boolean>(db, UPLOAD_ON_KEY, false).then((v) => v === true);

// ── 小程序清单（不要求登录） ─────────────────────────────────────────
type Item = { id: string; name: string; thumb: string; large: string; layout?: number };
const itemOf = (base: string, t: Pick<PosterTemplate, 'id' | 'name' | 'version' | 'layout'>, withLayout = true): Item => ({
  id: t.id, name: t.name, thumb: imgUrl(base, t.id, t.version, 't'), large: imgUrl(base, t.id, t.version, 'l'), ...(withLayout ? { layout: t.layout } : {})
});

/**
 * categories：老包用的（按 tier、sort），一个字段都不动。
 * sections（指令 83 智能排序，today = 洛杉矶今天，非正式环境可拨）：
 *   greeting（在祝福窗口里、且有上架祝福图的节日，各一段，近的在上）→ festival「快到的节日」（节日类活动分类按离今天天数从近到远，
 *   过了显示期的按明年算）→ regular「常用活动」（其他活动分类按该类模板 uses 之和从高到低，同分按原顺序）。空的段不给。
 */
export async function publicList(base: string, today: string = laToday()) {
  const pool = getPool();
  // 0054：只给「办活动」用途的分类和模板（祝福的走 /api/v1/greetings）
  const { rows: cats } = await pool.query<PosterCategory>(`SELECT ${CAT_COLS()} FROM poster_categories WHERE active AND purpose = 'event' ORDER BY tier, sort, key`);
  const { rows: tpls } = await pool.query<PosterTemplate>(
    `SELECT t.* FROM poster_templates t JOIN poster_categories c ON c.key = t.category_key
      WHERE t.status = 'active' AND c.active AND t.purpose = 'event' AND c.purpose = 'event' ORDER BY t.sort, t.created_at`
  );
  const { rows: v } = await pool.query<{ ms: string | null }>(`SELECT (extract(epoch FROM max(updated_at)) * 1000)::bigint::text AS ms FROM poster_templates WHERE purpose = 'event'`);
  const by = new Map<string, PosterTemplate[]>();
  for (const t of tpls) by.set(t.category_key, [...(by.get(t.category_key) ?? []), t]);
  const categories = cats
    .filter((c) => by.get(c.key)?.length)
    .map((c) => ({ key: c.key, name: c.name, tier: c.tier, items: (by.get(c.key) ?? []).map((t) => itemOf(base, t)) }));

  // ── 智能排序 ──
  const fests = await festivalsAt(today, pool);
  // 祝福段：窗口里、有祝福分类、分类上架且有上架祝福图
  const inWin = fests.filter((f) => f.inWindow && f.greet_category_key);
  const greetTpls = new Map<string, PosterTemplate[]>();
  if (inWin.length) {
    const { rows } = await pool.query<PosterTemplate>(
      `SELECT t.* FROM poster_templates t JOIN poster_categories c ON c.key = t.category_key
        WHERE t.category_key = ANY($1::text[]) AND t.status = 'active' AND c.active AND t.purpose = 'greeting' AND c.purpose = 'greeting'
        ORDER BY t.sort, t.created_at`,
      [inWin.map((f) => f.greet_category_key)]
    );
    for (const t of rows) greetTpls.set(t.category_key, [...(greetTpls.get(t.category_key) ?? []), t]);
  }
  const greeting = inWin
    .filter((f) => greetTpls.get(f.greet_category_key!)?.length)
    .sort((a, b) => Math.abs(a.days!) - Math.abs(b.days!) || a.days! - b.days! || a.sort - b.sort)
    .map((f) => ({
      kind: 'greeting' as const, title: `${f.name}祝福`, festival: f.key, category: f.greet_category_key, date: f.date,
      items: (greetTpls.get(f.greet_category_key!) ?? []).map((t) => itemOf(base, t, false))
    }));
  // 节日活动段：一个分类挂了多个节日时取最近的
  const festOf = new Map<string, { date: string; days: number; festival: string }>();
  for (const f of fests) {
    if (!f.category_key || f.date == null || f.days == null) continue;
    const had = festOf.get(f.category_key);
    if (!had || f.days < had.days) festOf.set(f.category_key, { date: f.date, days: f.days, festival: f.key });
  }
  const order = new Map(categories.map((c, i) => [c.key, i]));
  const festCats = categories
    .filter((c) => festOf.has(c.key))
    .sort((a, b) => festOf.get(a.key)!.days - festOf.get(b.key)!.days || order.get(a.key)! - order.get(b.key)!)
    .map((c) => ({ ...c, festival: festOf.get(c.key)!.festival, date: festOf.get(c.key)!.date, days: festOf.get(c.key)!.days }));
  const usesOf = (k: string) => (by.get(k) ?? []).reduce((s, t) => s + (Number(t.uses) || 0), 0);
  const regCats = categories
    .filter((c) => !festOf.has(c.key))
    .sort((a, b) => usesOf(b.key) - usesOf(a.key) || order.get(a.key)! - order.get(b.key)!);
  const sections = [
    ...greeting,
    ...(festCats.length ? [{ kind: 'festival' as const, title: '快到的节日', categories: festCats }] : []),
    ...(regCats.length ? [{ kind: 'regular' as const, title: '常用活动', categories: regCats }] : [])
  ];

  return { version: Number(v[0]?.ms ?? 0), uploadOn: await uploadOn(pool), today, categories, sections };
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
    `SELECT t.id FROM poster_templates t JOIN poster_categories c ON c.key = t.category_key
      WHERE t.id = $1 AND t.status = 'active' AND c.active AND t.purpose = 'event' AND c.purpose = 'event'`,
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
  const { rows: categories } = await pool.query<PosterCategory>(`SELECT ${CAT_COLS()} FROM poster_categories ORDER BY purpose, tier, sort, key`);
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
  const { rows } = await db.query<PosterCategory>(`SELECT ${CAT_COLS()} FROM poster_categories WHERE key = $1`, [key]);
  if (!rows[0]) throw new CrmError('bad_request', '请选分类');
  return rows[0];
}
async function mustTemplate(db: Db, id: string): Promise<PosterTemplate> {
  const t = await getTemplate(id, db);
  if (!t) throw new CrmError('not_found', '找不到这张模板');
  return t;
}

/** 上传新模板：排在这个分类最后，默认上架；用途跟着分类（祝福分类的模板可以带落款位 sigBox） */
export async function uploadNew(s: Staff, f: { category: string; name: string; file: Buffer; box?: unknown; ink?: unknown; sigBox?: unknown }) {
  const pool = getPool();
  const cat = await mustCategory(pool, txt(f.category, 40));
  const name = txt(f.name, 30);
  if (!name) throw new CrmError('bad_request', '请给模板起个名字（30 字以内）');
  const imgs = await makeImages(f.file);
  const code = `${cat.key}-U${randomBytes(4).toString('hex')}`;
  const urls = await putImages(cat.key, code, 1, imgs);
  const box = parseBox(f.box);
  const ink = typeof f.ink === 'string' && INK.test(f.ink) ? f.ink : null;
  const sigBox = cat.purpose === 'greeting' ? parseSigBox(f.sigBox) : null;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO poster_templates (code, category_key, name, image_url, thumb_url, box, ink, layout, sort, source, purpose, sig_box)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, (SELECT coalesce(max(sort), 0) + 1 FROM poster_templates WHERE category_key = $2), '后台上传', $8, $9) RETURNING id`,
    [code, cat.key, name, urls.imageUrl, urls.thumbUrl, box ? JSON.stringify(box) : null, ink, cat.purpose, sigBox ? JSON.stringify(sigBox) : null]
  );
  await audit(pool, s, 'poster_tpl_upload', 'poster_template', rows[0].id, { after: { code, category: cat.key, name, purpose: cat.purpose, sigBox } });
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

/** 落款位 [x0,y0,x1,y1]（0–1）：比信息位放宽（落款可以只占一窄条：宽 ≥ 0.2、高 ≥ 0.04） */
export function parseSigBox(v: unknown): number[] | null {
  if (v == null || v === '') return null;
  let a = v;
  if (typeof v === 'string') { try { a = JSON.parse(v); } catch { return null; } }
  if (!Array.isArray(a) || a.length !== 4) return null;
  const n = a.map(Number);
  if (n.some((x) => !Number.isFinite(x) || x < 0 || x > 1)) return null;
  if (n[2] - n[0] < 0.2 || n[3] - n[1] < 0.04) return null;
  return n.map((x) => Math.round(x * 10000) / 10000);
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** 'YYYY-MM-DD' 而且是真实存在的日期 */
export function parseDate(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!DATE.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}

/** 后台的各种小改动：下架 / 恢复 / 上下移 / 改分类 / 改名 / 落款位（祝福）/ 节日日期（祝福分类） */
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
  if (action === 'set_festival_date') {
    const pool = getPool();
    const cat = await mustCategory(pool, txt(b.category, 40));
    if (cat.purpose !== 'greeting') throw new CrmError('bad_request', '只有祝福分类有节日日期');
    const date = parseDate(b.date);
    if (!date) throw new CrmError('bad_request', '日期格式不对，请按 2026-12-25 这样写');
    await pool.query(`UPDATE poster_categories SET festival_date = $2, updated_at = now() WHERE key = $1`, [cat.key, date]);
    await audit(pool, s, 'poster_cat_date', 'poster_category', cat.key, { before: cat.festival_date, after: date });
    return { message: `已把「${cat.name}」的日期改成 ${date}` };
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
      // 用途跟着新分类走（活动 ↔ 祝福）
      await db.query(`UPDATE poster_templates SET category_key = $2, purpose = $3, sort = (SELECT coalesce(max(sort), 0) + 1 FROM poster_templates WHERE category_key = $2), updated_at = now() WHERE id = $1`, [t.id, cat.key, cat.purpose]);
      await audit(db, s, 'poster_tpl_category', 'poster_template', t.id, { before: { category: t.category_key, purpose: t.purpose }, after: { category: cat.key, purpose: cat.purpose } });
      const moved = cat.purpose !== t.purpose ? `，用途改成「${PURPOSE_LABEL[cat.purpose]}」` : '';
      return { message: `已把「${t.name}」挪到「${cat.name}」（排在最后${moved}）` };
    }
    if (action === 'set_sig_box') {
      if (t.purpose !== 'greeting') throw new CrmError('bad_request', '只有祝福模板有落款位');
      const clear = b.sigBox == null || b.sigBox === '';
      const sigBox = clear ? null : parseSigBox(b.sigBox);
      if (!clear && !sigBox) throw new CrmError('bad_request', '落款位要填 4 个 0–1 之间的数（左、上、右、下），宽至少 0.2、高至少 0.04');
      await db.query(`UPDATE poster_templates SET sig_box = $2, updated_at = now() WHERE id = $1`, [t.id, sigBox ? JSON.stringify(sigBox) : null]);
      await audit(db, s, 'poster_tpl_sig_box', 'poster_template', t.id, { before: t.sig_box, after: sigBox });
      return { message: sigBox ? `已设好「${t.name}」的落款位` : `已清掉「${t.name}」的落款位（出图时用默认底部并垫底板）` };
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
type ImportCat = { key?: unknown; name?: unknown; tier?: unknown; sort?: unknown; purpose?: unknown; festival_date?: unknown };
type ImportTpl = {
  code?: unknown; category_key?: unknown; name?: unknown; image_url?: unknown; thumb_url?: unknown; box?: unknown; ink?: unknown; layout?: unknown; sort?: unknown; source?: unknown;
  purpose?: unknown; sig_box?: unknown;
};
const purposeOf = (v: unknown): Purpose | null => (v === 'event' || v === 'greeting' ? v : null);
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
      if (x.purpose != null && !purposeOf(x.purpose)) throw new CrmError('bad_request', `分类「${key}」的用途只能是 event / greeting`);
      if (x.festival_date != null && x.festival_date !== '' && !parseDate(x.festival_date)) throw new CrmError('bad_request', `分类「${key}」的日期要写成 2026-12-25 这样`);
      const r = await db.query(
        `INSERT INTO poster_categories (key, name, tier, sort, purpose, festival_date) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (key) DO NOTHING`,
        [key, name, int(x.tier, 3), int(x.sort, 0), purposeOf(x.purpose) ?? 'event', parseDate(x.festival_date)]
      );
      c += r.rowCount ?? 0;
    }
    for (const x of tpls) {
      const code = txt(x.code, 60);
      const imageUrl = txt(x.image_url, 500);
      const thumbUrl = txt(x.thumb_url, 500);
      if (!code || !txt(x.name, 30) || !BLOB_URL.test(imageUrl) || !BLOB_URL.test(thumbUrl)) throw new CrmError('bad_request', `模板「${code}」缺编号 / 名字，或图片不是 poster-templates 下的 Blob 地址`);
      const box = parseBox(x.box);
      // 用途：传了就按传的，没传跟着分类；和分类不一致的拒收（不然两边清单都不出现）
      if (x.purpose != null && !purposeOf(x.purpose)) throw new CrmError('bad_request', `模板「${code}」的用途只能是 event / greeting`);
      const { rows: cr } = await db.query<{ purpose: Purpose }>(`SELECT purpose FROM poster_categories WHERE key = $1`, [txt(x.category_key, 40)]);
      if (!cr[0]) throw new CrmError('bad_request', `模板「${code}」的分类「${txt(x.category_key, 40)}」不存在`);
      const purpose = purposeOf(x.purpose) ?? cr[0].purpose;
      if (purpose !== cr[0].purpose) throw new CrmError('bad_request', `模板「${code}」的用途和分类「${txt(x.category_key, 40)}」的用途不一致`);
      const sigBox = x.sig_box == null || x.sig_box === '' ? null : parseSigBox(x.sig_box);
      if (x.sig_box != null && x.sig_box !== '' && !sigBox) throw new CrmError('bad_request', `模板「${code}」的落款位不对（4 个 0–1 的数，宽 ≥ 0.2、高 ≥ 0.04）`);
      const r = await db.query(
        `INSERT INTO poster_templates (code, category_key, name, image_url, thumb_url, box, ink, layout, sort, source, purpose, sig_box)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (code) DO NOTHING`,
        [code, txt(x.category_key, 40), txt(x.name, 30), imageUrl, thumbUrl, box ? JSON.stringify(box) : null,
          typeof x.ink === 'string' && INK.test(x.ink) ? x.ink : null, int(x.layout, 1), int(x.sort, 0), txt(x.source, 40) || null,
          purpose, purpose === 'greeting' && sigBox ? JSON.stringify(sigBox) : null]
      );
      t += r.rowCount ?? 0;
    }
    await audit(db, s, 'poster_tpl_import', 'poster_template', 'import', { after: { categories: c, templates: t, sent: { categories: cats.length, templates: tpls.length } } });
    return { categories: c, templates: t, message: `新加 ${c} 个分类、${t} 张模板（已有的编号跳过）` };
  });
}
