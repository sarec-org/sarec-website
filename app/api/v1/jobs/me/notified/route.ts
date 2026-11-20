/** GET /api/v1/jobs/me/notified —— 通知给我的活儿：{ count, webUrl, items? }（小程序只给条数和网址） */
import { handler, ok } from '@/lib/crm/http';
import { requireLogin, viewer } from '@/lib/jobs/access';
import { notifiedPosts } from '@/lib/jobs/posts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const v = await viewer(req);
  return ok(await notifiedPosts(requireLogin(v), v.mp));
});
