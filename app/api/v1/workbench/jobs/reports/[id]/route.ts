/** POST /api/v1/workbench/jobs/reports/:id { note? } —— 标记已处理 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { handleReport } from '@/lib/jobs/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  return ok(await handleReport(s, params.id, await body(req)));
});
