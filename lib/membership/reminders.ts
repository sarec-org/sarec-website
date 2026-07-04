/**
 * 会员到期 / semiAnnual 第二期付款提醒扫描 + 发送（服务端）。
 * ------------------------------------------------------------------
 * 日期口径：America/Los_Angeles（SAREC 运营地）。用 date 级比较：
 *   目标日 = (now() AT TIME ZONE 'America/Los_Angeles')::date + N。
 * 幂等：reminder_log UNIQUE(application_id, reminder_type, reminder_target)，
 *   claim-before-send；同一天重复跑 / 重复 curl 不重复发。
 * 第二期以 DB 实际 second_payment_due_date 为准（含 manual_override），不重算 +6 个月。
 * 不自动扣款 / 续费 / 取消 / 退款。
 */
import { query } from '@/lib/db/client';
import { getTierSeed } from './tiers';
import { getResend, getFromAddress, getAdminEmail, isEmailConfigured } from '@/lib/email/resend-client';
import {
  buildMembershipExpiryApplicant,
  buildMembershipExpiryAdmin,
  buildSecondPaymentApplicant,
  buildSecondPaymentAdmin,
  type ReminderEmailData,
  type ReminderNode
} from '@/lib/email/reminder-templates';

export const REMINDER_TIMEZONE = 'America/Los_Angeles';

export type ReminderSummary = {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  note?: string;
};

type ScanRow = {
  id: string;
  application_type: string;
  company_name: string | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  selected_tier_slug: string | null;
  payment_status: string;
  application_status: string;
  membership_end_date: string | null;
  second_payment_due_date: string | null;
  second_payment_due_date_source: string | null;
  second_payment_due_date_note: string | null;
  first_payment_paid_at: string | null;
  second_payment_paid_at: string | null;
};

const MEMBERSHIP_OFFSETS: Array<[number, string]> = [
  [30, 'membership_expiry_30_days'],
  [7, 'membership_expiry_7_days'],
  [0, 'membership_expiry_today']
];
const SECOND_OFFSETS: Array<[number, string]> = [
  [30, 'second_payment_due_30_days'],
  [7, 'second_payment_due_7_days'],
  [0, 'second_payment_due_today']
];

function nodeOf(offset: number): ReminderNode {
  if (offset === 30) return '30_days';
  if (offset === 7) return '7_days';
  return 'today';
}

function toData(r: ScanRow): ReminderEmailData {
  const tier = r.selected_tier_slug ? getTierSeed(r.selected_tier_slug) : undefined;
  return {
    applicationId: r.id,
    applicationType: r.application_type,
    companyName: r.company_name,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    tierNameEn: tier?.nameEn ?? r.selected_tier_slug ?? '',
    tierNameZh: tier?.nameZh ?? r.selected_tier_slug ?? '',
    paymentStatus: r.payment_status,
    applicationStatus: r.application_status,
    membershipEndDate: r.membership_end_date,
    secondPaymentDueDate: r.second_payment_due_date,
    secondPaymentDueDateSource: r.second_payment_due_date_source,
    secondPaymentDueDateNote: r.second_payment_due_date_note,
    firstPaymentPaidAt: r.first_payment_paid_at,
    secondPaymentPaidAt: r.second_payment_paid_at
  };
}

type Email = { subject: string; html: string; text: string };

// claim-before-send；返回并累加 summary。
async function handle(
  summary: ReminderSummary,
  applicationId: string,
  reminderType: string,
  target: 'applicant' | 'admin',
  recipient: string,
  scheduledFor: string | null,
  build: () => Email
): Promise<void> {
  const claim = await query<{ id: number }>(
    `INSERT INTO reminder_log
       (application_id, reminder_type, reminder_target, scheduled_for, email, status, sent_at)
     VALUES ($1,$2,$3,$4::date,$5,'sent',now())
     ON CONFLICT (application_id, reminder_type, reminder_target) DO NOTHING
     RETURNING id`,
    [applicationId, reminderType, target, scheduledFor, recipient]
  );
  if (claim.length === 0) {
    summary.skipped++; // 已有记录（sent/failed）→ 幂等跳过
    return;
  }
  const claimId = claim[0].id;
  try {
    const { subject, html, text } = build();
    const res = await getResend().emails.send({ from: getFromAddress(), to: recipient, subject, html, text });
    if (res.error) throw new Error(res.error.message || 'resend error');
    await query(
      `UPDATE reminder_log SET resend_email_id=$2, status='sent', sent_at=now() WHERE id=$1`,
      [claimId, res.data?.id ?? null]
    );
    summary.sent++;
  } catch (e) {
    await query(
      `UPDATE reminder_log SET status='failed', error_message=$2, sent_at=null WHERE id=$1`,
      [claimId, (e instanceof Error ? e.message : 'unknown').slice(0, 500)]
    );
    summary.failed++;
  }
}

export async function runMembershipReminders(): Promise<ReminderSummary> {
  const summary: ReminderSummary = { scanned: 0, sent: 0, skipped: 0, failed: 0 };

  if (!isEmailConfigured()) {
    // 未配置邮件：不 claim、不发（留待配置后再发），安全返回。
    return { ...summary, note: 'email_not_configured' };
  }
  const adminEmail = getAdminEmail();

  // ── 会员到期提醒 ────────────────────────────────────────────────
  for (const [offset, type] of MEMBERSHIP_OFFSETS) {
    const rows = await query<ScanRow>(
      `SELECT a.id, a.application_type, a.company_name, a.contact_name, a.email, a.phone,
              a.selected_tier_slug, a.payment_status, a.application_status,
              to_char(a.membership_end_date,'YYYY-MM-DD') AS membership_end_date,
              to_char(a.second_payment_due_date,'YYYY-MM-DD') AS second_payment_due_date,
              a.second_payment_due_date_source, a.second_payment_due_date_note,
              to_char(a.first_payment_paid_at,'YYYY-MM-DD HH24:MI') AS first_payment_paid_at,
              to_char(a.second_payment_paid_at,'YYYY-MM-DD HH24:MI') AS second_payment_paid_at
         FROM applications a
        WHERE a.membership_end_date IS NOT NULL
          AND a.membership_end_date = ((now() AT TIME ZONE '${REMINDER_TIMEZONE}')::date + $1::int)
          AND a.application_status NOT IN ('rejected','cancelled')
          AND a.payment_status IN ('paid','partially_paid')
          AND a.email IS NOT NULL AND a.email <> ''`,
      [offset]
    );
    const node = nodeOf(offset);
    for (const r of rows) {
      summary.scanned++;
      const data = toData(r);
      await handle(summary, r.id, type, 'applicant', r.email, r.membership_end_date, () =>
        buildMembershipExpiryApplicant(data, node)
      );
      if (adminEmail) {
        await handle(summary, r.id, type, 'admin', adminEmail, r.membership_end_date, () =>
          buildMembershipExpiryAdmin(data, node)
        );
      }
    }
  }

  // ── 第二期付款提醒 ──────────────────────────────────────────────
  for (const [offset, type] of SECOND_OFFSETS) {
    const rows = await query<ScanRow>(
      `SELECT a.id, a.application_type, a.company_name, a.contact_name, a.email, a.phone,
              a.selected_tier_slug, a.payment_status, a.application_status,
              to_char(a.membership_end_date,'YYYY-MM-DD') AS membership_end_date,
              to_char(a.second_payment_due_date,'YYYY-MM-DD') AS second_payment_due_date,
              a.second_payment_due_date_source, a.second_payment_due_date_note,
              to_char(a.first_payment_paid_at,'YYYY-MM-DD HH24:MI') AS first_payment_paid_at,
              to_char(a.second_payment_paid_at,'YYYY-MM-DD HH24:MI') AS second_payment_paid_at
         FROM applications a
        WHERE a.application_type='strategic_partner' AND a.payment_plan='semiAnnual'
          AND a.second_payment_due_date IS NOT NULL
          AND a.second_payment_paid_at IS NULL
          AND a.payment_status='partially_paid'
          AND a.application_status NOT IN ('rejected','cancelled')
          AND a.email IS NOT NULL AND a.email <> ''
          AND a.second_payment_due_date = ((now() AT TIME ZONE '${REMINDER_TIMEZONE}')::date + $1::int)`,
      [offset]
    );
    const node = nodeOf(offset);
    for (const r of rows) {
      summary.scanned++;
      const data = toData(r);
      await handle(summary, r.id, type, 'applicant', r.email, r.second_payment_due_date, () =>
        buildSecondPaymentApplicant(data, node)
      );
      if (adminEmail) {
        await handle(summary, r.id, type, 'admin', adminEmail, r.second_payment_due_date, () =>
          buildSecondPaymentAdmin(data, node)
        );
      }
    }
  }

  return summary;
}
