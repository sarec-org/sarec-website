/** GET/PATCH /api/v1/workbench/jobs/switches —— 三个开关 { find, work, requirePaid }；改动记谁、什么时候（PATCH 只限管理员） */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { setSwitches, switchesDetail } from '@/lib/jobs/settings';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await switchesDetail());
});
export const PATCH = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  await setSwitches(await body(req), `staff:${s.name || s.email}`);
  return ok(await switchesDetail());
});
