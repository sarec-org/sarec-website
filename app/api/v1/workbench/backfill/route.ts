/** 1.3.1 A1：补登记到场（工作台 / 网站后台共用）。
 *  GET ?eventId= → 这场的补登记记录；POST { eventId, contactId? | name, phone, cc?, note? } → 补报名并记到场（活动已结束也能补），留操作记录。 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { backfillAttendance, backfillLog } from '@/lib/crm/dupMerge';
import { mpSafe } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'checkin');
  const eventId = new URL(req.url).searchParams.get('eventId');
  if (!eventId) throw new CrmError('bad_request', '请先选择活动');
  return ok(mpSafe({ log: await backfillLog(eventId) }));
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'checkin');
  const b = await body<{ eventId?: string; contactId?: string; name?: string; phone?: string; cc?: string; note?: string }>(req);
  if (!b.eventId) throw new CrmError('bad_request', '请先选择活动');
  return ok(mpSafe(await backfillAttendance(s, b.eventId, b)));
});
