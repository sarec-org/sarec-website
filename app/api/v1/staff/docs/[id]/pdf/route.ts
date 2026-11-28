/** POST /api/v1/staff/docs/:id/pdf { url, pagesFromPdf? } —— 浏览器已直传的 PDF：逐页转图 + 找红线字样（或只当“PDF 原件”保存）。挂了活动的讲座课件另外做手机版 + 扫码页 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { processPdf, setPdfOnly, type DocRow } from '@/lib/docs/service';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const OURS = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'admin');
  const b = await body<{ url?: string; pagesFromPdf?: boolean }>(req);
  if (!b.url || !OURS.test(b.url)) throw new CrmError('bad_request', 'PDF 地址不对，请重新上传');
  const r = await fetch(b.url);
  if (!r.ok) throw new CrmError('bad_request', 'PDF 取不到，请重新上传');
  const pdf = Buffer.from(await r.arrayBuffer());
  if (b.pagesFromPdf === false) return ok({ doc: await setPdfOnly(params.id, pdf, b.url) });
  // 指令 103 / 104：挂在活动上的讲座课件——原稿留着给电脑下载，手机版压图、最后加扫码页
  const { rows } = await getPool().query<DocRow & { event_title: string | null }>(
    `SELECT d.*, e.title AS event_title FROM chamber_docs d JOIN events e ON e.id = d.event_id WHERE d.id = $1`, [params.id]);
  if (rows[0]) {
    const { processLecture } = await import('@/lib/docs/slides');
    const r = await processLecture(rows[0], pdf, b.url, s.name || s.email, rows[0].event_title ?? rows[0].title);
    (await import('@/lib/crm/board')).clearBoardCache();
    return ok({ doc: r.doc, notes: r.notes });
  }
  return ok({ doc: await processPdf(params.id, pdf, b.url) });
});
