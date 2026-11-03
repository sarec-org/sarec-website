/** POST /api/v1/rooms/bookings/:id/cancel —— 自助取消预约 */
import { cancelBooking } from '@/lib/crm/venue';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => ok(await cancelBooking(await requireContact(req), params.id)));
