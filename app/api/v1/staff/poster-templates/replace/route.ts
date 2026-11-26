/** POST /api/v1/staff/poster-templates/replace（multipart: file, id）—— 换模板图，版本 +1 */
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { replaceImage } from '@/lib/org/posterTemplates';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选新图片');
  return ok(await replaceImage(s, String(form?.get('id') ?? ''), Buffer.from(await f.arrayBuffer())));
});
