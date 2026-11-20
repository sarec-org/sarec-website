/**
 * GET   /api/v1/jobs/posts/:id —— 活儿详情 + 我能不能联系（不含电话）
 * PATCH /api/v1/jobs/posts/:id —— 发布人改内容、改状态（open/found/closed）、续期 { renew:true }；
 *        续期链接不用登录：{ renew:true, token }
 * 小程序一律 404（D1）
 */
import { body, handler, ok } from '@/lib/crm/http';
import { denyMpPosts, viewer } from '@/lib/jobs/access';
import { getPost, patchPost } from '@/lib/jobs/posts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await denyMpPosts(req);
  return ok(await getPost(params.id, await viewer(req)));
});
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await denyMpPosts(req);
  return ok(await patchPost(params.id, await viewer(req), await body(req)));
});
