/** GET /api/v1/workbench/jobs/reports?status=open|handled —— 反馈 / 投诉 */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { staffReports } from '@/lib/jobs/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await staffReports(new URL(req.url).searchParams.get('status')));
});
