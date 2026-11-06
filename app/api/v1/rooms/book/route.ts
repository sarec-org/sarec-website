/** POST /api/v1/rooms/book { roomId, startsAt, endsAt, purpose? } —— 先定先得；有月卡直接确认，否则生成订单 */
import { bookRoomFor } from '@/lib/crm/venue';
import { body, handler, ok, requireContact, denyMp12 } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  await denyMp12(req);
  const me = await requireContact(req);
  const b = await body<{ roomId?: number; startsAt?: string; endsAt?: string; purpose?: string }>(req);
  return ok({ booking: await bookRoomFor(me, Number(b.roomId ?? 1), String(b.startsAt), String(b.endsAt), b.purpose) });
});
