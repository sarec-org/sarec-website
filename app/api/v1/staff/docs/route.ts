/** GET /api/v1/staff/docs —— 后台商会资料列表（含打开 / 转发次数、红线提醒）；POST 新建一份（admin） */
import { body, handler, ok, requireStaff, siteUrl } from '@/lib/crm/http';
import { saveDoc, siteFileUrl, staffList } from '@/lib/docs/service';
import { BLOB_PREFIX } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'admin');
  const base = siteUrl(req);
  return ok({ docs: (await staffList()).map((d) => ({ ...d, pdf_site_url: siteFileUrl(d.pdf_url, base) })), uploadPrefix: BLOB_PREFIX });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  return ok({ doc: await saveDoc(s, null, await body<Record<string, unknown>>(req)) });
});
