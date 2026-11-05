/** 活动相册（ops）
 *  GET —— 全部照片（含隐藏）+ 照片授权名单；POST multipart files[] —— 上传（自动加水印；单次请求不超过 4MB，页面会先压缩）
 *  PATCH { photoId, hidden?, caption?, sort? }；DELETE ?photoId= */
import { CrmError } from '@/lib/crm/events';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { consentSummary, deletePhoto, listEventPhotos, updatePhoto, uploadEventPhotos } from '@/lib/crm/photos';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  const { rows } = await getPool().query(`SELECT id, slug, title, recap, album_published_at, cover_url FROM events WHERE id = $1`, [params.id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  return ok({ event: rows[0], photos: await listEventPhotos(params.id, true), consent: await consentSummary(params.id) });
});
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const files: { name: string; data: Buffer }[] = [];
  for (const f of form?.getAll('files') ?? []) {
    if (typeof f === 'string') continue;
    if (!/^image\//.test(f.type)) continue;
    files.push({ name: f.name || 'photo.jpg', data: Buffer.from(await f.arrayBuffer()) });
  }
  if (!files.length) throw new CrmError('bad_request', '请选择照片');
  return ok(await uploadEventPhotos(actor(s), params.id, files));
});
export const PATCH = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const b = await body<{ photoId?: string; hidden?: boolean; caption?: string | null; sort?: number }>(req);
  if (!b.photoId) throw new CrmError('bad_request', '缺少照片');
  await updatePhoto(b.photoId, b);
  return ok({ ok: true });
});
export const DELETE = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const id = new URL(req.url).searchParams.get('photoId');
  if (!id) throw new CrmError('bad_request', '缺少照片');
  await deletePhoto(id);
  return ok({ ok: true });
});
