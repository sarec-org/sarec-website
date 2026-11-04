/** POST /api/v1/staff/orders/:no/reject { reason } —— 核实未到账：取消订单、退回抵扣积分、撤销 Zelle 先生效的会籍（finance） */
import { rejectOrder } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { no: string } }) => {
  const s = await requireStaff(req, 'finance');
  const b = await body<{ reason?: string }>(req);
  return ok(await rejectOrder(s, params.no, String(b.reason ?? '')));
});
