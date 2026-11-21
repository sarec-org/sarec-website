/** GET /api/v1/staff/data-summary?days=30 —— 「数据」页最上面的四个问题（只读） */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { dataSummary } from '@/lib/crm/dataSummary';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await dataSummary(Number(new URL(req.url).searchParams.get('days')) || 30));
});
