/** POST /api/v1/rooms/pass { month: 'YYYY-MM' } —— 购买会场月卡（同月重复点击回到原订单） */
import { buyRoomPass } from '@/lib/crm/venue';
import { body, handler, ok, requireContact, denyMp12 } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  await denyMp12(req);
  const me = await requireContact(req);
  const b = await body<{ month?: string }>(req);
  return ok(await buyRoomPass(me, String(b.month ?? '')));
});
