/** POST /api/v1/me/profile/image（multipart: file）—— 1.5.0 个人主页项目图片上传，返回地址（保存项目后先审后发） */
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact } from '@/lib/crm/http';
import { uploadImage } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const POST = handler(async (req: Request) => {
  await requireContact(req);
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '没有收到图片，请再试一次');
  return ok({ url: await uploadImage('card', Buffer.from(await f.arrayBuffer()), { maxSide: 1600 }) });
});
