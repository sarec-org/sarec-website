/** POST /api/v1/jobs/posts/:id/contact —— 联系发布人：有资格 → { phone, wechat?, callName? } 并记录谁看过；没资格 → 403 not_eligible + 一句人话原因。小程序 404 */
import { handler, ok } from '@/lib/crm/http';
import { denyMpPosts, requireLogin, viewer } from '@/lib/jobs/access';
import { contactPost } from '@/lib/jobs/posts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await denyMpPosts(req);
  const v = await viewer(req);
  return ok(await contactPost(params.id, v, requireLogin(v)));
});
