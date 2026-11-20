/** DELETE /api/v1/workbench/jobs/trades/:key —— 删除工种（已有活儿的不能删，改成不开放） */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { deleteTrade } from '@/lib/jobs/trades';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const DELETE = handler(async (req: Request, { params }: { params: { key: string } }) => {
  const s = await requireStaff(req, 'ops');
  await deleteTrade(params.key, `staff:${s.name || s.email}`);
  return ok({ deleted: params.key });
});
