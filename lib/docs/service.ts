/**
 * 商会资料（1.3.3）：公司 PPT 介绍等。后台上传 PDF（服务器逐页转图）或一组图片；小程序里一页一屏看、转发卡片、查看 / 转发 PDF 原件。
 * 内容红线：PDF 里读到“$、美元、元、会费、价格、收益率”这类字样时标出第几页，只提醒、不改内容（图片做的 PDF 读不到字，提示人工核）。
 */
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { BLOB_PREFIX, blobConfigured } from '@/lib/crm/photos';
import type { Staff } from '@/lib/crm/auth';

export type DocPage = { url: string; w: number; h: number };
export type RedFlag = { page: number; words: string[] };
export type DocRow = {
  id: string; slug: string; title: string; summary: string | null; cover_url: string | null; sort_order: number; is_public: boolean;
  pdf_url: string | null; pdf_bytes: number | null; pages: DocPage[]; red_flags: RedFlag[]; text_readable: boolean | null;
  open_count: number; share_count: number; pdf_count: number; created_at: Date; updated_at: Date;
};

/** 小程序审核红线字样（只提醒） */
const RED: [RegExp, string][] = [
  [/US\$|\$\s?\d|\$/, '$'], [/美元/, '美元'], [/\d\s*万?元|元\s*\/|人民币/, '元'], [/会费|年费/, '会费'], [/价格|定价|报价/, '价格'],
  [/收益率|回报率|年化/, '收益率'], [/保本|保证.{0,8}收益|承诺.{0,8}收益|稳赚|零风险/, '收益承诺'],
  [/收款|付款|转账|汇款|Zelle|Venmo|PayPal|支付宝|微信支付|银行账号|账户名/i, '收款方式']
];
export function redWords(text: string): string[] {
  return RED.filter(([re]) => re.test(text)).map(([, w]) => w);
}

/** 资料地址：小程序下载 PDF 只能走本站域名，经 /files/ 转到图片存储（不经函数，不受 4.5MB 限制） */
export function siteFileUrl(blobUrl: string | null, base: string): string | null {
  if (!blobUrl) return null;
  const m = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/(.+)$/i.exec(blobUrl);
  return m ? `${base.replace(/\/$/, '')}/files/${m[1]}` : blobUrl;
}

function publicView(d: DocRow, base: string) {
  return {
    slug: d.slug, title: d.title, summary: d.summary, cover: d.cover_url || d.pages[0]?.url || null,
    pages: d.pages.map((p) => ({ url: p.url, w: p.w, h: p.h })), pageCount: d.pages.length,
    pdfUrl: siteFileUrl(d.pdf_url, base), pdfBytes: d.pdf_bytes
  };
}

export async function listPublic(base: string) {
  const { rows } = await getPool().query<DocRow>(`SELECT * FROM chamber_docs WHERE is_public AND jsonb_array_length(pages) > 0 ORDER BY sort_order, created_at`);
  return rows.map((d) => { const v = publicView(d, base); return { slug: v.slug, title: v.title, summary: v.summary, cover: v.cover, pageCount: v.pageCount }; });
}
export async function getPublic(slug: string, base: string, staffPreview = false) {
  const { rows } = await getPool().query<DocRow>(`SELECT * FROM chamber_docs WHERE slug = $1`, [slug]);
  const d = rows[0];
  if (!d || (!d.is_public && !staffPreview) || !d.pages.length) throw new CrmError('not_found', '这份资料不存在或还没公开');
  return publicView(d, base);
}

export async function track(slug: string, kind: 'open' | 'share' | 'pdf', who: { contactId?: string | null; ref?: string | null; channel?: string | null }) {
  const db = getPool();
  const col = { open: 'open_count', share: 'share_count', pdf: 'pdf_count' }[kind];
  const { rows } = await db.query<{ id: string }>(`UPDATE chamber_docs SET ${col} = ${col} + 1 WHERE slug = $1 AND is_public RETURNING id`, [slug]);
  if (!rows[0]) return;
  const ref = who.ref && /^\d{1,9}$/.test(who.ref) ? who.ref : null;
  const channel = who.channel && /^[a-z0-9_-]{1,24}$/i.test(who.channel) ? who.channel : null;
  await db.query(`INSERT INTO chamber_doc_events (doc_id, kind, contact_id, ref, channel) VALUES ($1, $2, $3, $4, $5)`, [rows[0].id, kind, who.contactId ?? null, ref, channel]);
}

// ── 后台 ──────────────────────────────────────────────────────────────
export async function staffList() {
  const { rows } = await getPool().query<DocRow>(`SELECT * FROM chamber_docs ORDER BY sort_order, created_at`);
  return rows;
}
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export async function saveDoc(s: Staff, id: string | null, b: Record<string, unknown>) {
  const db = getPool();
  const title = clean(b.title, 40);
  if (!title) throw new CrmError('bad_request', '请填资料标题');
  const summary = clean(b.summary, 80) || null;
  const sort = Number.isFinite(Number(b.sortOrder)) ? Math.floor(Number(b.sortOrder)) : 0;
  const isPublic = b.isPublic === true;
  const cover = clean(b.coverUrl, 500) || null;
  if (id) {
    const { rows } = await db.query<DocRow>(
      `UPDATE chamber_docs SET title = $2, summary = $3, sort_order = $4, is_public = $5, cover_url = COALESCE($6, cover_url), updated_at = now() WHERE id = $1 RETURNING *`,
      [id, title, summary, sort, isPublic, cover]
    );
    if (!rows[0]) throw new CrmError('not_found', '找不到这份资料');
    if (isPublic && !rows[0].pages.length) throw new CrmError('bad_request', '先上传 PDF 或页面图片，再设为公开');
    return rows[0];
  }
  const slug = clean(b.slug, 40).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || `doc-${randomUUID().slice(0, 6)}`;
  const { rows } = await db.query<DocRow>(
    `INSERT INTO chamber_docs (slug, title, summary, sort_order, is_public, cover_url, created_by) VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING *`,
    [slug, title, summary, sort, cover, s.contactId]
  ).catch((e) => { if ((e as { code?: string }).code === '23505') throw new CrmError('conflict', '这个英文短名已经有了，换一个'); throw e; });
  return rows[0];
}
export async function deleteDoc(id: string) {
  await getPool().query(`DELETE FROM chamber_docs WHERE id = $1`, [id]);
}

async function putPage(docId: string, n: number, jpg: Buffer): Promise<string> {
  return (await put(`${BLOB_PREFIX}/docs/${docId}/${randomUUID().slice(0, 8)}-p${String(n).padStart(2, '0')}.jpg`, jpg, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false })).url;
}

/** PDF 逐页转图（2400 宽，手机双指放大看得清小字）+ 读字找红线字样 */
export async function processPdf(docId: string, pdf: Buffer, pdfUrl: string | null): Promise<DocRow> {
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  const mupdf = await import('mupdf');
  let doc: InstanceType<typeof mupdf.Document>;
  try { doc = mupdf.Document.openDocument(pdf, 'application/pdf'); } catch { throw new CrmError('bad_request', '这个 PDF 打不开，请在 PowerPoint 里重新“导出为 PDF”再传'); }
  const n = doc.countPages();
  if (n < 1 || n > 80) throw new CrmError('bad_request', `PDF 页数不对（${n} 页），最多 80 页`);
  const pages: DocPage[] = [];
  const flags: RedFlag[] = [];
  let textChars = 0;
  for (let i = 0; i < n; i++) {
    const page = doc.loadPage(i);
    const [x0, , x1] = page.getBounds();
    const scale = Math.min(4, 2400 / Math.max(1, x1 - x0));
    const pix = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
    const jpg = await sharp(Buffer.from(pix.asPNG())).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    pages.push({ url: await putPage(docId, i + 1, jpg), w: pix.getWidth(), h: pix.getHeight() });
    const text = page.toStructuredText('preserve-whitespace').asText();
    textChars += text.replace(/\s/g, '').length;
    const w = redWords(text);
    if (w.length) flags.push({ page: i + 1, words: w });
  }
  const { rows } = await getPool().query<DocRow>(
    `UPDATE chamber_docs SET pages = $2, red_flags = $3, text_readable = $4, pdf_url = COALESCE($5, pdf_url), pdf_bytes = COALESCE($6, pdf_bytes), updated_at = now() WHERE id = $1 RETURNING *`,
    [docId, JSON.stringify(pages), JSON.stringify(flags), textChars > n * 20, pdfUrl, pdfUrl ? pdf.length : null]
  );
  if (!rows[0]) throw new CrmError('not_found', '找不到这份资料');
  return rows[0];
}

/** 直接用一组图片当页面（按传入顺序）；图片读不到字，不做红线检查 */
export async function setImagePages(docId: string, images: Buffer[]): Promise<DocRow> {
  if (!blobConfigured()) throw new CrmError('storage_unconfigured', '图片存储还没有配置');
  if (!images.length || images.length > 80) throw new CrmError('bad_request', '请上传 1–80 张页面图片');
  const pages: DocPage[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = sharp(images[i], { failOn: 'none' }).rotate().resize({ width: 2667, height: 2667, fit: 'inside', withoutEnlargement: true });
    const jpg = await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    const m = await sharp(jpg).metadata();
    pages.push({ url: await putPage(docId, i + 1, jpg), w: m.width ?? 0, h: m.height ?? 0 });
  }
  // 页面换成图片后，原来的 PDF 原件和这组页面不再对应（也可能还带着红线字样），一并去掉；需要的话再“只换 PDF 原件”
  const { rows } = await getPool().query<DocRow>(`UPDATE chamber_docs SET pages = $2, red_flags = '[]'::jsonb, text_readable = false, pdf_url = NULL, pdf_bytes = NULL, updated_at = now() WHERE id = $1 RETURNING *`, [docId, JSON.stringify(pages)]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这份资料');
  return rows[0];
}

/** 只换 PDF 原件（页面图片已经有了，比如逐页图片另外传的） */
export async function setPdfOnly(docId: string, pdf: Buffer, pdfUrl: string): Promise<DocRow> {
  // 只换 PDF 原件也要查红线字样（原件在小程序里能看、能转发）
  const mupdf = await import('mupdf');
  let flags: RedFlag[] = [];
  let readable = false;
  try {
    const doc = mupdf.Document.openDocument(pdf, 'application/pdf');
    let chars = 0;
    const n = doc.countPages();
    for (let i = 0; i < n; i++) {
      const text = doc.loadPage(i).toStructuredText('preserve-whitespace').asText();
      chars += text.replace(/\s/g, '').length;
      const w = redWords(text);
      if (w.length) flags.push({ page: i + 1, words: w });
    }
    readable = chars > n * 20;
  } catch { throw new CrmError('bad_request', '这个 PDF 打不开，请在 PowerPoint 里重新“导出为 PDF”再传'); }
  const { rows } = await getPool().query<DocRow>(
    `UPDATE chamber_docs SET pdf_url = $2, pdf_bytes = $3, red_flags = $4, text_readable = CASE WHEN $5 THEN true ELSE text_readable END, updated_at = now() WHERE id = $1 RETURNING *`,
    [docId, pdfUrl, pdf.length, JSON.stringify(flags), readable]
  );
  if (!rows[0]) throw new CrmError('not_found', '找不到这份资料');
  flags = rows[0].red_flags;
  return rows[0];
}

export async function docStats(docId: string) {
  const { rows } = await getPool().query<{ kind: string; n: number; refs: number }>(
    `SELECT kind, count(*)::int AS n, count(DISTINCT ref)::int AS refs FROM chamber_doc_events WHERE doc_id = $1 GROUP BY kind`,
    [docId]
  );
  return rows;
}
