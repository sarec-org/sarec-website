/** GET /api/v1/workbench/jobs/pros?status=pending —— 接活人核验队列（带官方查询页 officialUrl、核验清单 checklist、CSLB 自动比对结果） */
import { handler, isMiniProgramRequest, ok, requireStaff } from '@/lib/crm/http';
import { staffProList } from '@/lib/jobs/verify';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await staffProList(new URL(req.url).searchParams.get('status'), { mp: await isMiniProgramRequest(req) }));
});
