/** POST /api/v1/staff/checkin { eventId, contactId } —— 代签到（checkin；同样走入场判断，重复操作不重复签到/发分）
 *  POST { eventId, onsite: { name, phone?, email?, roleSub? } } —— 现场登记 + 报名 + 签到 */
import { onsiteRegister, staffCheckIn } from '@/lib/crm/staff';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'checkin');
  const b = await body<{ eventId?: string; contactId?: string; onsite?: { name?: string; phone?: string; email?: string; roleSub?: string } }>(req);
  if (!b.eventId) throw new CrmError('bad_request', '请先选择活动');
  if (b.onsite) return ok(await onsiteRegister(s, b.eventId, b.onsite));
  if (!b.contactId) throw new CrmError('bad_request', '请先选择要签到的人');
  return ok({ result: await staffCheckIn(s, b.eventId, b.contactId) });
});
