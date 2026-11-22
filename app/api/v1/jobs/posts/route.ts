/**
 * GET  /api/v1/jobs/posts?trade=&city=&cursor= —— 活儿列表（公开：描述和城市；不含电话）
 * POST /api/v1/jobs/posts —— 发布活儿（按工种拆成多条，返回 ids）
 * 小程序一律 404（D1：活儿只在网站）
 */
import { body, handler, ok } from '@/lib/crm/http';
import { denyMpPosts, requireLogin, requireSide, viewer } from '@/lib/jobs/access';
import { createPosts, listPosts } from '@/lib/jobs/posts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await denyMpPosts(req);
  const v = await viewer(req);
  requireSide(v, 'work');
  const q = new URL(req.url).searchParams;
  return ok(await listPosts({ trade: q.get('trade'), city: q.get('city'), cursor: q.get('cursor') }));
});
export const POST = handler(async (req: Request) => {
  await denyMpPosts(req);
  const v = await viewer(req);
  requireSide(v, 'find');
  return ok(await createPosts(v, requireLogin(v), await body(req)));
});
