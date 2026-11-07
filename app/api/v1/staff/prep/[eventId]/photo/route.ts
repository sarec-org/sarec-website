/** POST /api/v1/staff/prep/:eventId/photo（multipart: file, itemId）—— 给某项加照片（比如背景屏实拍） */
import { CrmError } from '@/lib/crm/events';
import { uploadImage } from '@/lib/crm/photos';
import { updatePrepItem } from '@/lib/crm/prep';
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { eventId: string } }) => {
  const s = await requireStaffAny(req, ['ops', 'checkin']);
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  const itemId = Number(form?.get('itemId'));
  if (!f || typeof f === 'string' || !itemId) throw new CrmError('bad_request', '请选择照片');
  const url = await uploadImage('prep', Buffer.from(await f.arrayBuffer()), { maxSide: 1600 });
  await updatePrepItem(params.eventId, itemId, s.name, { photoUrl: url });
  return ok({ url });
});
