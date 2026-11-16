/** POST /api/v1/staff/showcase/image（multipart: file）—— 1.5.0 后台「商会风采」上传标志 / 项目图片，只存图返回 url（保存单位时再写进库） */
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { uploadImage } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选一张图片');
  if (f.size > 15 * 1024 * 1024) throw new CrmError('bad_request', '图片太大了（超过 15MB），请换一张小一点的');
  // 标志用 png（保留透明底），项目图用 jpg
  const logo = String(form?.get('kind') ?? '') === 'logo';
  const url = await uploadImage('card', Buffer.from(await f.arrayBuffer()), logo ? { maxSide: 800, png: true } : { maxSide: 1600 });
  return ok({ url });
});
