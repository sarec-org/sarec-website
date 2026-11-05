/** GET /api/v1/staff/room-info —— 会议室展示信息；POST { id, capacity, equipment, intro, photoUrls } 或 multipart file（上传照片，返回地址）（ops） */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { uploadImage } from '@/lib/crm/photos';
import { roomsInfo, updateRoomInfo } from '@/lib/crm/staff12';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await roomsInfo());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
    const f = (await req.formData()).get('file');
    if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选择照片');
    return ok({ url: await uploadImage('room', Buffer.from(await f.arrayBuffer()), { maxSide: 1600 }) });
  }
  return ok(await updateRoomInfo(s, await body(req)));
});
