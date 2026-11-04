/** GET /api/v1/staff/orders?status=open|pending_payment|payment_submitted|paid|cancelled&purpose=&q= —— 核款工作台（finance） */
import { listOrders } from '@/lib/crm/staff';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'finance');
  const sp = new URL(req.url).searchParams;
  return ok({ orders: await listOrders({ status: sp.get('status'), purpose: sp.get('purpose'), q: sp.get('q') }) });
});
