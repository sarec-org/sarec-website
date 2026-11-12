/**
 * 商会资料一次性录入（1.3.3）：把一个文件夹里的逐页图片（pages/*.jpg）+ 小程序版 PDF 录成一份公开资料。可重复执行（同一个 slug 覆盖更新）。
 * 用法：DATABASE_URL=<库> BLOB_READ_WRITE_TOKEN=<存储令牌> npx tsx scripts/docs-import.ts <文件夹> --slug sarec-intro --title "…" --summary "…" --pdf <PDF 文件名> [--prod]
 *   --prod：写正式库（图片存到 prod/ 目录）；不带就是测试库（test/ 目录）。正式库只在东哥用 ! 跑时用。
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { getPool } from '@/lib/db/client';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
async function main() {
  const dir = process.argv[2];
  const slug = arg('--slug');
  const title = arg('--title');
  const summary = arg('--summary') ?? null;
  const pdfName = arg('--pdf');
  const prod = process.argv.includes('--prod');
  if (!dir || !slug || !title || !pdfName) throw new Error('用法见文件开头');
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('缺 BLOB_READ_WRITE_TOKEN');
  const prefix = prod ? 'prod' : 'test';
  const pool = getPool();
  const { rows: ex } = await pool.query<{ id: string }>(`SELECT id FROM chamber_docs WHERE slug = $1`, [slug]);
  const id = ex[0]?.id ?? randomUUID();
  const files = (await readdir(join(dir, 'pages'))).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (!files.length) throw new Error('pages/ 里没有图片');
  const tag = randomUUID().slice(0, 8);
  const pages: { url: string; w: number; h: number }[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const jpg = await sharp(await readFile(join(dir, 'pages', f)), { failOn: 'none' }).rotate().resize({ width: 2667, height: 2667, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    const m = await sharp(jpg).metadata();
    const url = (await put(`${prefix}/docs/${id}/${tag}-p${String(i + 1).padStart(2, '0')}.jpg`, jpg, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false })).url;
    pages.push({ url, w: m.width ?? 0, h: m.height ?? 0 });
    console.log(`第 ${i + 1} / ${files.length} 页 ✓`);
  }
  const pdf = await readFile(join(dir, pdfName));
  const pdfUrl = (await put(`${prefix}/docs/${id}/${tag}-${slug}.pdf`, pdf, { access: 'public', contentType: 'application/pdf', addRandomSuffix: false })).url;
  await pool.query(
    `INSERT INTO chamber_docs (id, slug, title, summary, cover_url, sort_order, is_public, pdf_url, pdf_bytes, pages, red_flags, text_readable)
     VALUES ($1, $2, $3, $4, $5, 0, true, $6, $7, $8, '[]'::jsonb, false)
     ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, cover_url = EXCLUDED.cover_url, is_public = true,
       pdf_url = EXCLUDED.pdf_url, pdf_bytes = EXCLUDED.pdf_bytes, pages = EXCLUDED.pages, red_flags = '[]'::jsonb, text_readable = false, updated_at = now()`,
    [id, slug, title, summary, pages[0].url, pdfUrl, pdf.length, JSON.stringify(pages)]
  );
  console.log(`完成：${title}（${slug}），${pages.length} 页，PDF ${(pdf.length / 1048576).toFixed(1)} MB，已公开`);
  await pool.end();
}
main().catch(async (e) => { console.error('✗', e instanceof Error ? e.message : e); process.exit(1); });
