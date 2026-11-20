/** GET /api/v1/workbench/jobs/posts?status= —— 活儿列表（小程序只给 {id,title,status,contactCount,note}，不给金额） */
import { handler, isMiniProgramRequest, ok, requireStaff } from '@/lib/crm/http';
import { staffPosts } from '@/lib/jobs/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await staffPosts({ status: new URL(req.url).searchParams.get('status'), mp: await isMiniProgramRequest(req) }));
});
