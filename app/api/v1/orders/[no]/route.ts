/** GET /api/v1/orders/:no —— 订单与付款信息（Zelle 收款人、二维码、Stripe 是否可用）；?stripe=success 时主动核对 Stripe */
import { getPool } from '@/lib/db/client';
import { getOwnOrder, PURPOSE_LABEL, STATUS_LABEL, stripeAvailable, syncStripeOrder, zelleInfo } from '@/lib/crm/orders';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { no: string } }) => {
  const me = await requireContact(req);
  let o = await getOwnOrder(getPool(), params.no, me);
  if (new URL(req.url).searchParams.get('stripe') === 'success') o = await syncStripeOrder(o);
  return ok({
    order: {
      orderNo: o.order_no, purpose: o.purpose, purposeLabel: PURPOSE_LABEL[o.purpose], description: o.description,
      amountCents: o.amount_cents, grossCents: o.gross_cents ?? o.amount_cents, pointsRedeemed: o.points_redeemed,
      status: o.status, statusLabel: STATUS_LABEL[o.status], provider: o.provider, payerNote: o.payer_note,
      submittedAt: o.submitted_at, paidAt: o.paid_at, rejectReason: o.reject_reason, relatedId: o.related_id
    },
    zelle: zelleInfo(),
    stripe: { available: stripeAvailable() }
  });
});
