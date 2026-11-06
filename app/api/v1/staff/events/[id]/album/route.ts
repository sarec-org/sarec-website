/** POST /api/v1/staff/events/:id/album { recap? } —— 发布相册并通知到场的人（重复点击不重复推送）；{ resend: true } 只重推失败的 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { publishAlbum, sendPhotoNotices } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  const b = await body<{ recap?: string; resend?: boolean }>(req);
  return ok(b.resend ? await sendPhotoNotices(params.id) : await publishAlbum(params.id, b.recap));
});
