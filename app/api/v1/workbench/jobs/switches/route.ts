/** GET/PATCH /api/v1/workbench/jobs/switches —— 栏目开关 { find, work } + D28 收费设置 { feeMode, freeContacts, freePosts }（旧字段 requirePaid 兼容）；立即生效，每项改动记谁、何时、改前改后（PATCH 只限管理员） */
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
