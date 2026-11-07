/** POST /api/v1/me/photos/:id/variant（multipart: file）—— 美颜版：本人分享用，关联原照片，不进相册 */
import { attachVariant } from '@/lib/crm/customerPhotos';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireContact(req);
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '没有收到照片');
  return ok(await attachVariant(me, params.id, Buffer.from(await f.arrayBuffer())));
});
