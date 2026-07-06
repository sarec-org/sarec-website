/**
 * Stripe webhook 业务处理（服务端）：幂等去重 + paid 回写 + 会员有效期。
 * ------------------------------------------------------------------
 * 主事件 = checkout.session.completed。金额以「已验签」的 event 对象为准，
 * 与 DB payment.amount_cents 比对；不一致不标 paid，记 stripe_events=failed。
 * 幂等：stripe_events.stripe_event_id 为主键；同一事件重放只处理一次。
 * M4 边界：不发邮件、不写 Cron、不做 subscription/自动续费/自动退款、不写 admin API。
 */
import type Stripe from 'stripe';
import { query, withTransaction } from '@/lib/db/client';
import { dispatchPaymentNotificationsSafe } from '@/lib/email/notifications';
import { dispatchSecretaryAssignmentSafe } from '@/lib/email/ops-notifications';
import { autoOperationsStatusAfterPaid } from '@/lib/membership/operations';

export type WebhookOutcome = {
  outcome: 'processed' | 'skipped' | 'ignored' | 'failed';
  detail: string;
};

const REQUIRED_META = [
  'applicationId',
  'paymentId',
  'applicationType',
  'installmentNumber',
  'agreementVersion'
] as const;

function firstMissingMeta(meta: Stripe.Metadata | null): string | null {
  const m = meta ?? {};
  for (const k of REQUIRED_META) {
    if (!m[k]) return k;
  }
  if (!m.selectedTierSlug && !m.paymentPlan) return 'selectedTierSlug|paymentPlan';
  return null;
}

// 记录非成功事件（ignored / failed）到 stripe_events；幂等 insert。
async function recordEvent(
  event: Stripe.Event,
  status: 'ignored' | 'failed',
  opts: { appId?: string | null; payId?: string | null; error?: string | null } = {}
): Promise<void> {
  await query(
    `INSERT INTO stripe_events
       (stripe_event_id, event_type, livemode, processing_status,
        related_application_id, related_payment_id, raw_event_created, error_message)
     VALUES ($1,$2,$3,$4,$5,$6, to_timestamp($7), $8)
     ON CONFLICT (stripe_event_id) DO NOTHING`,
    [
      event.id,
      event.type,
      event.livemode,
      status,
      opts.appId ?? null,
      opts.payId ?? null,
      event.created,
      opts.error ?? null
    ]
  );
}

type JoinRow = {
  pay_id: string;
  amount_cents: number;
  currency: string;
  pay_status: string;
  application_id: string;
  app_id: string;
  application_type: string;
  payment_plan: string | null;
  selected_tier_slug: string | null;
  app_pay_status: string;
  second_payment_due_date_source: string | null;
};

export async function processStripeEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  // ── 幂等快路：已见过的事件直接跳过（重放保护）───────────────────────
  const existing = await query<{ processing_status: string }>(
    'SELECT processing_status FROM stripe_events WHERE stripe_event_id = $1',
    [event.id]
  );
  if (existing.length > 0) {
    return { outcome: 'skipped', detail: `already ${existing[0].processing_status}` };
  }

  // payment_intent.succeeded 仅记录，不作为主回写事件（避免与 checkout 重复）。
  if (event.type === 'payment_intent.succeeded') {
    await recordEvent(event, 'ignored', { error: 'payment_intent.succeeded not primary' });
    return { outcome: 'ignored', detail: 'payment_intent.succeeded recorded as ignored' };
  }

  if (event.type !== 'checkout.session.completed') {
    await recordEvent(event, 'ignored', { error: `unhandled type ${event.type}` });
    return { outcome: 'ignored', detail: `unhandled type ${event.type}` };
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== 'paid') {
    await recordEvent(event, 'ignored', { error: `payment_status=${session.payment_status}` });
    return { outcome: 'ignored', detail: `session not paid (${session.payment_status})` };
  }

  const missing = firstMissingMeta(session.metadata);
  if (missing) {
    await recordEvent(event, 'failed', { error: `missing metadata: ${missing}` });
    return { outcome: 'failed', detail: `missing metadata: ${missing}` };
  }

  const applicationId = session.metadata!.applicationId;
  const paymentId = session.metadata!.paymentId;

  const rows = await query<JoinRow>(
    `SELECT p.id AS pay_id, p.amount_cents, p.currency, p.payment_status AS pay_status,
            p.application_id,
            a.id AS app_id, a.application_type, a.payment_plan, a.selected_tier_slug,
            a.payment_status AS app_pay_status, a.second_payment_due_date_source
       FROM payments p JOIN applications a ON a.id = p.application_id
      WHERE p.id = $1 AND a.id = $2`,
    [paymentId, applicationId]
  );
  if (rows.length === 0) {
    await recordEvent(event, 'failed', {
      appId: applicationId,
      payId: paymentId,
      error: 'application/payment not found'
    });
    return { outcome: 'failed', detail: 'application/payment not found' };
  }
  const row = rows[0];

  // ── 金额 / 币种校验（以已验签的 event 对象为准）────────────────────
  const stripeCurrency = (session.currency ?? '').toLowerCase();
  if (
    session.amount_total !== row.amount_cents ||
    stripeCurrency !== 'usd' ||
    row.currency !== 'usd'
  ) {
    await recordEvent(event, 'failed', {
      appId: row.app_id,
      payId: row.pay_id,
      error: `amount/currency mismatch stripe=${session.amount_total}/${stripeCurrency} db=${row.amount_cents}/${row.currency}`
    });
    return { outcome: 'failed', detail: 'amount/currency mismatch — NOT marked paid' };
  }

  // 已 paid → 幂等忽略（防重复回写有效期）。
  if (row.pay_status === 'paid') {
    await recordEvent(event, 'ignored', {
      appId: row.app_id,
      payId: row.pay_id,
      error: 'payment already paid'
    });
    return { outcome: 'ignored', detail: 'payment already paid' };
  }

  const isSemiAnnual =
    row.application_type === 'strategic_partner' && row.payment_plan === 'semiAnnual';
  // 运营流转初始态：普通会员 → paid_under_review;理事及以上 / 战略合作伙伴 → needs_owner_review。
  const opsStatus = autoOperationsStatusAfterPaid(row.application_type, row.selected_tier_slug);
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;
  const customerId = typeof session.customer === 'string' ? session.customer : null;

  try {
    await withTransaction(async (client) => {
      // 单笔 payment → paid（条件 payment_status<>'paid' 防并发重复）。
      const upd = await client.query(
        `UPDATE payments
            SET payment_status='paid', paid_at=now(),
                stripe_payment_intent_id=COALESCE($2, stripe_payment_intent_id),
                stripe_customer_id=COALESCE($3, stripe_customer_id),
                stripe_event_id=$4, updated_at=now()
          WHERE id=$1 AND payment_status <> 'paid'`,
        [row.pay_id, paymentIntentId, customerId, event.id]
      );
      if (upd.rowCount === 0) {
        throw new Error('payment already paid (race)');
      }

      if (isSemiAnnual) {
        // semiAnnual 首期：整体只算 partially_paid；写有效期 + 第二期到期日（尊重 admin 覆盖）。
        await client.query(
          `UPDATE applications SET
             payment_status='partially_paid',
             application_status='under_review',
             first_payment_paid_at=now(),
             membership_start_date=(now())::date,
             membership_end_date=(now()+interval '12 months')::date,
             second_payment_due_date = CASE WHEN second_payment_due_date_source='manual_override'
                                            THEN second_payment_due_date
                                            ELSE (now()+interval '6 months')::date END,
             second_payment_due_date_source = CASE WHEN second_payment_due_date_source='manual_override'
                                                   THEN second_payment_due_date_source
                                                   ELSE 'auto_calculated' END,
             operations_status=COALESCE(operations_status,$2),
             updated_at=now()
           WHERE id=$1`,
          [row.app_id, opsStatus]
        );
      } else {
        await client.query(
          `UPDATE applications SET
             payment_status='paid',
             application_status='under_review',
             first_payment_paid_at=now(),
             membership_start_date=(now())::date,
             membership_end_date=(now()+interval '12 months')::date,
             operations_status=COALESCE(operations_status,$2),
             updated_at=now()
           WHERE id=$1`,
          [row.app_id, opsStatus]
        );
      }

      // 事件留档（普通 INSERT：重复主键会抛错 → 整个事务回滚 → 并发重放不重复回写）。
      await client.query(
        `INSERT INTO stripe_events
           (stripe_event_id, event_type, livemode, processing_status,
            related_application_id, related_payment_id, raw_event_created)
         VALUES ($1,$2,$3,'processed',$4,$5, to_timestamp($6))`,
        [event.id, event.type, event.livemode, row.app_id, row.pay_id, event.created]
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    // 并发重放：重复主键冲突 → 已被另一路处理 → 跳过。
    if (/duplicate key|stripe_events_pkey|already paid \(race\)/i.test(msg)) {
      return { outcome: 'skipped', detail: 'concurrent duplicate' };
    }
    await recordEvent(event, 'failed', { appId: row.app_id, payId: row.pay_id, error: msg });
    return { outcome: 'failed', detail: msg };
  }

  // 付款回写已提交成功后再发邮件；邮件失败不抛错、不回滚、不影响 200 响应。
  await dispatchPaymentNotificationsSafe(row.app_id, row.pay_id);
  // 秘书工作安排邮件（info@ + 东哥）——同样永不抛错。
  await dispatchSecretaryAssignmentSafe(row.app_id, row.pay_id);

  return {
    outcome: 'processed',
    detail: isSemiAnnual
      ? 'semiAnnual first installment paid → application partially_paid'
      : 'paid → application under_review'
  };
}
