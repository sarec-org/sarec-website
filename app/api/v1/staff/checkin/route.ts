/** POST /api/v1/staff/checkin { eventId, contactId } —— 代签到（checkin；同样走入场判断，重复操作不重复签到/发分）
 *  POST { eventId, onsite: { name, phone, email?, roleSub? } } —— 现场登记 + 报名 + 签到（手机号必填）
 *  POST { eventId, contactId, addPhone, cc? } —— 给到场但档案里没有手机号的人补手机号 */
import { addPhone, hasPhone, onsiteRegister, staffCheckIn } from '@/lib/crm/staff';
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'checkin');
  const b = await body<{ eventId?: string; contactId?: string; addPhone?: string; cc?: string; onsite?: { name?: string; phone?: string; email?: string; roleSub?: string } }>(req);
  if (!b.eventId) throw new CrmError('bad_request', '请先选择活动');
  if (b.onsite) return ok(await onsiteRegister(s, b.eventId, b.onsite));
  if (!b.contactId) throw new CrmError('bad_request', '请先选择要签到的人');
  // 后台综合优化 七.3：到场的人没有手机号 → 签到结果里带 missingPhone，签到台当场问一下补上（addPhone）
  if (b.addPhone) return ok(await addPhone(s, b.contactId, b.addPhone, b.cc));
  const result = await staffCheckIn(s, b.eventId, b.contactId);
  return ok({ result, missingPhone: !(await hasPhone(getPool(), b.contactId)) });
});
