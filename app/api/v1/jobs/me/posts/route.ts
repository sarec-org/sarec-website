/** GET /api/v1/jobs/me/posts —— 我的活儿（含谁联系过）。小程序 404（D1） */
import { handler, ok } from '@/lib/crm/http';
import { denyMpPosts, requireLogin, viewer } from '@/lib/jobs/access';
import { myPosts } from '@/lib/jobs/posts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await denyMpPosts(req);
  return ok(await myPosts(requireLogin(await viewer(req))));
});
