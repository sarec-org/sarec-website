/** POST /api/v1/staff/offers { id?, merchant, offer, ... , delete? } —— 商家优惠新增/修改/删除（ops） */
import { upsertOffer } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await upsertOffer(s, await body(req)));
});
