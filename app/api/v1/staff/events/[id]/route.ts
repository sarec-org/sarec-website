/** GET /api/v1/staff/events/:id —— 活动详情 + 报名名单 + 签到码（ops/checkin）；PATCH —— 修改 / 关闭报名 / 改状态（ops）；
 *  POST { action: 'regenerate_code' } —— 重新生成签到码（ops，旧码立即失效） */
import { getStaffEvent, regenerateCheckinSecret, updateEvent, type EventInput } from '@/lib/crm/staff';
import { staffCan, staffFor } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireContact, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type P = { params: { id: string } };
export const GET = handler(async (req: Request, { params }: P) => {
  const s = await staffFor(await requireContact(req));
  if (!staffCan(s, 'ops') && !staffCan(s, 'checkin')) throw new CrmError('forbidden', '您没有这个操作的权限，请联系管理员开通');
  return ok(await getStaffEvent(params.id));
});
export const PATCH = handler(async (req: Request, { params }: P) => {
  const s = await requireStaff(req, 'ops');
  return ok(await updateEvent(s, params.id, await body<EventInput>(req)));
});
export const POST = handler(async (req: Request, { params }: P) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ action?: string }>(req);
  if (b.action !== 'regenerate_code') throw new CrmError('bad_request', '未知操作');
  return ok(await regenerateCheckinSecret(s, params.id));
});
