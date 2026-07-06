/**
 * 付款成功后发邮件（服务端）。幂等 claim-before-send，防 webhook 重放重复发信。
 * ------------------------------------------------------------------
 * - 幂等键：email_notifications UNIQUE(payment_id, notification_type, recipient_email)。
 *   先 INSERT ... ON CONFLICT DO NOTHING RETURNING id 抢占；抢到才发，抢不到即跳过。
 * - 邮件失败只把该行标 failed，绝不抛错、绝不回滚付款状态。
 * - 缺 RESEND_API_KEY 时：安全日志 + 直接返回，不建行、不泄露 secret、不影响付款。
 * - dispatchPaymentNotificationsSafe 永不抛错，供 webhook 成功回写后调用。
 */
import { query } from '@/lib/db/client';
import { getResend, getFromAddress, getAdminEmail, isEmailConfigured } from './resend-client';
import { buildApplicantConfirmation, buildAdminNotification, type PaymentEmailData } from './templates';
import { getTierSeed } from '@/lib/membership/tiers';

export type NotificationType =
  | 'applicant_payment_confirmation'
  | 'admin_new_paid_application'
  | 'secretary_work_assignment'
  | 'member_welcome';
export type RecipientRole = 'applicant' | 'admin' | 'secretary';

export type RowResult = 'sent' | 'failed' | 'skipped';

export async function claim(
  applicationId: string,
  paymentId: string,
  type: NotificationType,
  email: string,
  role: RecipientRole
): Promise<string | null> {
  const rows = await query<{ id: string }>(
    `INSERT INTO email_notifications
       (application_id, payment_id, notification_type, recipient_email, recipient_role, status)
     VALUES ($1,$2,$3,$4,$5,'pending')
     ON CONFLICT (payment_id, notification_type, recipient_email) DO NOTHING
     RETURNING id`,
    [applicationId, paymentId, type, email, role]
  );
  return rows[0]?.id ?? null;
}

async function markSent(id: string, resendId: string | null, subject: string): Promise<void> {
  await query(
    `UPDATE email_notifications SET status='sent', resend_email_id=$2, subject=$3, sent_at=now(), updated_at=now() WHERE id=$1`,
    [id, resendId, subject]
  );
}

async function markFailed(id: string, subject: string, error: string): Promise<void> {
  await query(
    `UPDATE email_notifications SET status='failed', subject=$2, error_message=$3, updated_at=now() WHERE id=$1`,
    [id, subject.slice(0, 300), error.slice(0, 500)]
  );
}

export async function sendClaimed(
  claimId: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<RowResult> {
  try {
    const res = await getResend().emails.send({ from: getFromAddress(), to, subject, html, text });
    if (res.error) {
      await markFailed(claimId, subject, res.error.message || 'resend error');
      return 'failed';
    }
    await markSent(claimId, res.data?.id ?? null, subject);
    return 'sent';
  } catch (e) {
    await markFailed(claimId, subject, e instanceof Error ? e.message : 'unknown send error');
    return 'failed';
  }
}

export async function loadEmailData(
  applicationId: string,
  paymentId: string
): Promise<PaymentEmailData | null> {
  const rows = await query<{
    application_type: 'membership' | 'strategic_partner';
    payment_plan: string;
    installment_number: number | null;
    selected_tier_slug: string | null;
    company_name: string | null;
    contact_name: string | null;
    email: string;
    phone: string | null;
    app_pay_status: string;
    application_status: string;
    start_date: string | null;
    end_date: string | null;
    second_due: string | null;
    amount_cents: number;
    currency: string;
    pay_status: string;
    session_id: string | null;
    payment_intent_id: string | null;
  }>(
    `SELECT a.application_type, a.payment_plan, p.installment_number,
            a.selected_tier_slug, a.company_name, a.contact_name, a.email, a.phone,
            a.payment_status AS app_pay_status, a.application_status,
            to_char(a.membership_start_date,'YYYY-MM-DD') AS start_date,
            to_char(a.membership_end_date,'YYYY-MM-DD') AS end_date,
            to_char(a.second_payment_due_date,'YYYY-MM-DD') AS second_due,
            p.amount_cents, p.currency, p.payment_status AS pay_status,
            p.stripe_checkout_session_id AS session_id, p.stripe_payment_intent_id AS payment_intent_id
       FROM applications a JOIN payments p ON p.id = $2 AND p.application_id = a.id
      WHERE a.id = $1`,
    [applicationId, paymentId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];

  const agRows = await query<{ agreement_version: string | null; agreement_hash: string | null }>(
    `SELECT agreement_version, agreement_hash FROM agreement_acceptances
      WHERE application_id = $1
        AND agreement_type IN ('membership_agreement','strategic_partnership_agreement')
      ORDER BY created_at LIMIT 1`,
    [applicationId]
  );

  const tier = r.selected_tier_slug ? getTierSeed(r.selected_tier_slug) : undefined;

  return {
    applicationId,
    paymentId,
    applicationType: r.application_type,
    paymentPlan: r.payment_plan,
    installmentNumber: r.installment_number ?? 1,
    tierSlug: r.selected_tier_slug ?? '',
    tierNameEn: tier?.nameEn ?? r.selected_tier_slug ?? '',
    tierNameZh: tier?.nameZh ?? r.selected_tier_slug ?? '',
    companyName: r.company_name,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    amountCents: r.amount_cents,
    currency: r.currency,
    paymentStatus: r.pay_status,
    appPaymentStatus: r.app_pay_status,
    applicationStatus: r.application_status,
    membershipStartDate: r.start_date,
    membershipEndDate: r.end_date,
    secondPaymentDueDate: r.second_due,
    agreementVersion: agRows[0]?.agreement_version ?? 'unknown',
    agreementHash: agRows[0]?.agreement_hash ?? null,
    stripeSessionId: r.session_id,
    stripePaymentIntentId: r.payment_intent_id
  };
}

export type DispatchSummary = {
  configured: boolean;
  applicant: RowResult | 'not_configured' | 'no_data';
  admin: RowResult | 'not_configured' | 'no_admin' | 'no_data';
};

/** 实际发送逻辑（可能抛错，由 Safe 包裹）。 */
async function dispatchPaymentNotifications(
  applicationId: string,
  paymentId: string
): Promise<DispatchSummary> {
  if (!isEmailConfigured()) {
    console.warn('[email] RESEND_API_KEY not set — skipping notifications (payment unaffected)');
    return { configured: false, applicant: 'not_configured', admin: 'not_configured' };
  }

  const data = await loadEmailData(applicationId, paymentId);
  if (!data) {
    return { configured: true, applicant: 'no_data', admin: 'no_data' };
  }

  const summary: DispatchSummary = { configured: true, applicant: 'skipped', admin: 'skipped' };

  // 申请人邮件
  const applicantClaim = await claim(
    applicationId,
    paymentId,
    'applicant_payment_confirmation',
    data.email,
    'applicant'
  );
  if (applicantClaim) {
    const { subject, html, text } = buildApplicantConfirmation(data);
    summary.applicant = await sendClaimed(applicantClaim, data.email, subject, html, text);
  } else {
    summary.applicant = 'skipped';
  }

  // 管理员邮件
  const admin = getAdminEmail();
  if (!admin) {
    summary.admin = 'no_admin';
  } else {
    const adminClaim = await claim(
      applicationId,
      paymentId,
      'admin_new_paid_application',
      admin,
      'admin'
    );
    if (adminClaim) {
      const { subject, html, text } = buildAdminNotification(data);
      summary.admin = await sendClaimed(adminClaim, admin, subject, html, text);
    } else {
      summary.admin = 'skipped';
    }
  }

  return summary;
}

/** 永不抛错版本，供 webhook 成功回写后调用；邮件失败不影响付款回写与 200 响应。 */
export async function dispatchPaymentNotificationsSafe(
  applicationId: string,
  paymentId: string
): Promise<DispatchSummary | null> {
  try {
    const s = await dispatchPaymentNotifications(applicationId, paymentId);
    console.log(`[email] dispatch app=${applicationId} applicant=${s.applicant} admin=${s.admin}`);
    return s;
  } catch (e) {
    console.error('[email] dispatch error (payment unaffected):', e instanceof Error ? e.message : 'unknown');
    return null;
  }
}
