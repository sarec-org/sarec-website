/** POST /api/v1/workbench/checkin { eventId, contactId } | { eventId, onsite: { name, phone } } —— 工作台：现场代签到 / 现场代报名（同网站签到台，返回不含金额） */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { onsiteRegister, staffCheckIn } from '@/lib/crm/staff';
import { mpSafe } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'checkin');
  const b = await body<{ eventId?: string; contactId?: string; onsite?: { name?: string; phone?: string } }>(req);
  if (!b.eventId) throw new CrmError('bad_request', '请先选择活动');
  if (b.onsite) return ok(mpSafe({ ...(await onsiteRegister(s, b.eventId, { name: b.onsite.name, phone: b.onsite.phone })) }));
  if (!b.contactId) throw new CrmError('bad_request', '请先选择要签到的人');
  return ok(mpSafe({ result: await staffCheckIn(s, b.eventId, b.contactId) }));
});
