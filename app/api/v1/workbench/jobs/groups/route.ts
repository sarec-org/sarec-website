/** POST /api/v1/workbench/jobs/groups { key, name, order } —— 新增或修改分组 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { upsertGroup } from '@/lib/jobs/trades';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok({ group: await upsertGroup(await body(req), `staff:${s.name || s.email}`) });
});
