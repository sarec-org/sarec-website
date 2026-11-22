/** GET /api/v1/workbench/jobs/stats?days=90 —— 每个工种：点击数、上列表人数、活儿数、联系次数、成了的数、平均多久有人联系 */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { stats } from '@/lib/jobs/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const d = Number(new URL(req.url).searchParams.get('days')) || 90;
  return ok(await stats(Math.min(Math.max(d, 1), 3650)));
});
