/** POST /api/v1/jobs/upload?kind=photo|voice（multipart，字段 file）→ { url }：发布活儿用的照片、语音。小程序 404 */
import { handler, ok } from '@/lib/crm/http';
import { denyMpPosts, requireLogin, viewer } from '@/lib/jobs/access';
import { uploadFromForm } from '@/lib/jobs/upload';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  await denyMpPosts(req);
  requireLogin(await viewer(req));
  const kind = new URL(req.url).searchParams.get('kind') === 'voice' ? 'voice' : 'image';
  return ok({ url: await uploadFromForm(req, kind), kind });
});
