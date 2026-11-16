/** 1.3 C 客户上传照片
 *  POST /api/v1/events/:slug/photos（multipart: file，手机端压好的分享版，长边约 1600）→ 存照片（完全相同的不重复存）
 *  GET  /api/v1/events/:slug/photos —— 我在这场活动上传的照片 */
import { listMyPhotos, uploadMyPhoto } from '@/lib/crm/customerPhotos';
import { CrmError } from '@/lib/crm/events';
import { handler, isMp14, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) =>
  ok({ photos: await listMyPhotos(await requireContact(req), decodeURIComponent(params.slug)) })
);
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '没有收到照片，请再试一次');
  // 1.4.0 及以上：上传即进相册；1.3.x：默认私人（它的页面就是这么写的）
  return ok({ photo: await uploadMyPhoto(me, decodeURIComponent(params.slug), Buffer.from(await f.arrayBuffer()), { toAlbum: isMp14(req) }) });
});
