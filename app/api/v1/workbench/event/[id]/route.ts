/** GET /api/v1/workbench/event/:id?q= —— 某场活动实时报名 / 签到名单（可搜索、一键拨号）；不含付款信息 */
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { mpSafe, workbenchEvent } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaffAny(req, ['checkin', 'ops']);
  return ok(mpSafe(await workbenchEvent(params.id, new URL(req.url).searchParams.get('q') ?? '')));
});
