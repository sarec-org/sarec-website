/** POST /api/v1/staff/docs/:id/images { urls: [] } —— 浏览器已直传的一组页面图片（按顺序）当资料页面 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { setImagePages } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const OURS = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i;
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'admin');
  const b = await body<{ urls?: string[] }>(req);
  const urls = Array.isArray(b.urls) ? b.urls.filter((u) => typeof u === 'string' && OURS.test(u)) : [];
  if (!urls.length) throw new CrmError('bad_request', '请上传页面图片');
  const bufs = await Promise.all(urls.map(async (u) => { const r = await fetch(u); if (!r.ok) throw new CrmError('bad_request', '有图片取不到，请重新上传'); return Buffer.from(await r.arrayBuffer()); }));
  return ok({ doc: await setImagePages(params.id, bufs) });
});
