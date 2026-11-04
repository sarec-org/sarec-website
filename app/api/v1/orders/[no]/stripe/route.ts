/** POST /api/v1/orders/:no/stripe —— 生成 Stripe 刷卡页面（没有美国银行账户的会员用） */
import { getPool } from '@/lib/db/client';
import { createStripeSessionForOrder, getOwnOrder } from '@/lib/crm/orders';
import { handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { no: string } }) => {
  const me = await requireContact(req);
  const pool = getPool();
  const o = await getOwnOrder(pool, params.no, me);
  const { rows } = await pool.query<{ email: string | null }>('SELECT email FROM contacts WHERE id = $1', [me]);
  return ok({ url: await createStripeSessionForOrder(o, siteUrl(req), rows[0]?.email ?? null) });
});
