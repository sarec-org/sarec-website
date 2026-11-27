/**
 * GET /api/v1/workbench/jobs/counts —— 指令 102：「找工人·接活儿」各标签上的红数字，也用来决定打开时默认停在哪个标签
 * （有待审的停在有待审的那个，都没有才停「开关」）。
 * { pros: 接活人等核验（含核验后又改了资料的）, posts: 小程序交来的活儿等派, reports: 没处理的投诉 }
 */
import { getPool } from '@/lib/db/client';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const { rows } = await getPool().query<{ pros: number; posts: number; reports: number }>(
    `SELECT (SELECT count(*)::int FROM jobs_pros WHERE status = 'pending' OR (needs_review AND status <> 'removed')) AS pros,
            (SELECT count(*)::int FROM jobs_posts WHERE status = 'pending') AS posts,
            (SELECT count(*)::int FROM jobs_reports WHERE status = 'open') AS reports`
  );
  return ok(rows[0] ?? { pros: 0, posts: 0, reports: 0 });
});
