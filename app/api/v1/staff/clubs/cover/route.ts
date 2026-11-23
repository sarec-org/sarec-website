/** POST /api/v1/staff/clubs/cover（multipart: file, key）—— 1.5.0 体验1：后台上传俱乐部封面（小程序首页方块 / 详情页用） */
import { setClubCover } from '@/lib/crm/clubs';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { uploadImage } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选封面图片');
  const url = await uploadImage('cover', Buffer.from(await f.arrayBuffer()), { maxSide: 1200 });
  return ok(await setClubCover(s.name || s.email, String(form?.get('key') ?? ''), url));
});
