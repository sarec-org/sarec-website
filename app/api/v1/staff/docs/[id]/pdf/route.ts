/** POST /api/v1/staff/docs/:id/pdf { url, pagesFromPdf? } —— 浏览器已直传的 PDF：逐页转图 + 找红线字样（或只当“PDF 原件”保存） */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { processPdf, setPdfOnly } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const OURS = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'admin');
  const b = await body<{ url?: string; pagesFromPdf?: boolean }>(req);
  if (!b.url || !OURS.test(b.url)) throw new CrmError('bad_request', 'PDF 地址不对，请重新上传');
  const r = await fetch(b.url);
  if (!r.ok) throw new CrmError('bad_request', 'PDF 取不到，请重新上传');
  const pdf = Buffer.from(await r.arrayBuffer());
  if (b.pagesFromPdf === false) {
    await setPdfOnly(params.id, b.url, pdf.length);
    return ok({});
  }
  return ok({ doc: await processPdf(params.id, pdf, b.url) });
});
