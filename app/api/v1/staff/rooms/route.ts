/** GET /api/v1/staff/rooms?from=&to= —— 会议室预约排期（ops）；POST { bookingId, reason? } —— 工作人员取消预约（ops） */
import { listBookings, staffCancelBooking } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  const from = sp.get('from') ?? new Date().toISOString();
  const to = sp.get('to') ?? new Date(Date.now() + 7 * 864e5).toISOString();
  return ok({ bookings: await listBookings(from, to) });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ bookingId?: string; reason?: string }>(req);
  return ok(await staffCancelBooking(s, String(b.bookingId ?? ''), String(b.reason ?? '')));
});
