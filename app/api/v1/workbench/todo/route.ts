/** GET /api/v1/workbench/todo —— 工作台待办：待跟进、待审名片、待审照片（ops；操作仍走网站后台同样的接口） */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { mpSafe, workbenchTodo } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(mpSafe(await workbenchTodo()));
});
