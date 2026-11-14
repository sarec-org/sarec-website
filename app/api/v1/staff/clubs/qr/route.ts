/** POST /api/v1/staff/clubs/qr（multipart: file, key, expires）—— 1.5.0 后台上传俱乐部群二维码 */
import { setGroupQr } from '@/lib/crm/clubs';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { uploadImage } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!f || typeof f === 'string') throw new CrmError('bad_request', '请选群二维码图片');
  const url = await uploadImage('qr', Buffer.from(await f.arrayBuffer()), { maxSide: 800, png: true });
  return ok(await setGroupQr(s.name || s.email, String(form?.get('key') ?? ''), url, String(form?.get('expires') ?? '') || null));
});
