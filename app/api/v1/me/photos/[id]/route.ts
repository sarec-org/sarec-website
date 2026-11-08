/** PATCH /api/v1/me/photos/:id { album: boolean } —— 放进活动相册 / 收回；DELETE —— 删除我的这张照片 */
import { deleteMyPhoto, setMyPhotoVisibility } from '@/lib/crm/customerPhotos';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const b = await body<{ album?: boolean }>(req);
  return ok({ photo: await setMyPhotoVisibility(await requireContact(req), params.id, b.album === true) });
});
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => ok(await deleteMyPhoto(await requireContact(req), params.id)));
