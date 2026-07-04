/**
 * 依 Stripe session_id 查本地 DB 付款状态（success 页用）。
 * ------------------------------------------------------------------
 * 只信任 DB 中 webhook 回写的 paid 状态，绝不凭 URL 里的 session_id 判定已付。
 * 缺 DATABASE_URL 或查询失败时，安全降级为「处理中」，不谎称已确认。
 */
import { query } from '@/lib/db/client';

export type CheckoutStatus = {
  found: boolean;
  paid: boolean;
  partiallyPaid: boolean;
  processing: boolean;
  applicationType: string | null;
  membershipEndDate: string | null;
};

const FALLBACK: CheckoutStatus = {
  found: false,
  paid: false,
  partiallyPaid: false,
  processing: true,
  applicationType: null,
  membershipEndDate: null
};

export async function getCheckoutStatusBySession(sessionId: string): Promise<CheckoutStatus> {
  if (!sessionId || !process.env.DATABASE_URL) {
    return FALLBACK;
  }
  try {
    const rows = await query<{
      pay_status: string;
      app_pay_status: string;
      application_type: string;
      end_date: string | null;
    }>(
      `SELECT p.payment_status AS pay_status,
              a.payment_status AS app_pay_status,
              a.application_type,
              to_char(a.membership_end_date, 'YYYY-MM-DD') AS end_date
         FROM payments p JOIN applications a ON a.id = p.application_id
        WHERE p.stripe_checkout_session_id = $1
        LIMIT 1`,
      [sessionId]
    );
    if (rows.length === 0) {
      return FALLBACK;
    }
    const r = rows[0];
    const paid = r.pay_status === 'paid';
    const partiallyPaid = r.app_pay_status === 'partially_paid';
    return {
      found: true,
      paid,
      partiallyPaid,
      processing: !paid,
      applicationType: r.application_type,
      membershipEndDate: r.end_date
    };
  } catch {
    return FALLBACK;
  }
}
