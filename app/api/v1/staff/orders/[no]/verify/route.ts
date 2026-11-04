/** POST /api/v1/staff/orders/:no/verify { reference? } —— 一键确认到账（finance；重复点击 changed=false，不重复处理） */
import { verifyOrder } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { no: string } }) => {
  const s = await requireStaff(req, 'finance');
  const b = await body<{ reference?: string }>(req);
  return ok(await verifyOrder(s, params.no, b.reference));
});
