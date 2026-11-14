/** POST /api/v1/staff/events/:id/album { recap? } —— 通知到场的人：照片出来了（1.4.0 起只是通知，照片上传后本来就能看到；重复点击不重复推送）；{ resend: true } 只重推失败的 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { publishAlbum, sendPhotoNotices } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  const b = await body<{ recap?: string; resend?: boolean }>(req);
  return ok(b.resend ? await sendPhotoNotices(params.id) : await publishAlbum(params.id, b.recap));
});
