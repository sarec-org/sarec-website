/** 会议室线下预约登记（ops）
 *  POST { roomId, contactId? | newName?, startsAt, endsAt, note?, payment?: { amountCents, provider, reference } } —— 登记（同一时段已有预约会被拒绝）
 *  PATCH { bookingId, payment: { amountCents, provider, reference } } —— 登记收款 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { staffCreateBooking, staffRecordBookingPayment } from '@/lib/crm/staff12';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await staffCreateBooking(s, await body(req)));
});
export const PATCH = handler(async (req: Request) => {
  const s = await requireStaff(req, 'finance');
  const b = await body<{ bookingId?: string; payment?: { amountCents?: number; provider?: string; reference?: string } }>(req);
  if (!b.bookingId || !b.payment) throw new CrmError('bad_request', '缺少预约或收款信息');
  return ok(await staffRecordBookingPayment(s, b.bookingId, b.payment));
});
