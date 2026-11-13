/** GET /api/v1/staff/client-errors?days=14 —— 后台「线上报错」：按天汇总，新出现的错误类型标红 */
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { clientErrorSummary } from '@/lib/crm/clientErrors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaffAny(req, ['ops', 'admin']);
  const d = Math.max(1, Math.min(60, Number(new URL(req.url).searchParams.get('days')) || 14));
  return ok({ rows: await clientErrorSummary(d) });
});
