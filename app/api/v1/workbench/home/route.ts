/** GET /api/v1/workbench/home —— 手机工作台首页：今日数据、活动实时人数、待办数（不含任何金额） */
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { mpSafe, workbenchHome } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(mpSafe(await workbenchHome(await requireStaffAny(req, ['checkin', 'ops'])))));
