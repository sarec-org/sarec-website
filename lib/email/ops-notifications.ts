/**
 * 运营工作流邮件派发（秘书工作安排 + 入会欢迎)。幂等 + 永不抛错。
 * ------------------------------------------------------------------
 * - 复用 notifications.ts 的 claim / sendClaimed / loadEmailData 原语（同一 email_notifications 表 + 幂等键）。
 * - 秘书工作安排：付款成功后由 webhook 触发,收件人 = SAREC_ADMIN_EMAIL(若配置) + info@ + 东哥,去重。
 * - 入会欢迎：秘书点「已通过」后触发,收件人 = 申请人。
 * - 缺 RESEND_API_KEY / 缺付款数据 时安全跳过,不建行、不泄露 secret、不影响任何写库。
 */
import { query } from '@/lib/db/client';
import { isEmailConfigured, getAdminEmail } from './resend-client';
import { claim, sendClaimed, loadEmailData } from './notifications';
import { buildSecretaryAssignment, buildWelcomeEmail } from './ops-templates';

// 秘书工作安排固定抄送（spec 四）。
const SECRETARY_RECIPIENTS = ['info@sinoamericanrec.org', 'wknmxjp@gmail.com'];

/** 找到该申请「已付款」的最近一笔 payment id（欢迎邮件走应用 id 触发时用）。 */
async function resolveLatestPaidPaymentId(applicationId: string): Promise<string | null> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM payments
      WHERE application_id = $1 AND payment_status = 'paid'
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1`,
    [applicationId]
  );
  return rows[0]?.id ?? null;
}

/**
 * 付款成功后发「秘书工作安排」邮件。永不抛错。
 * 幂等键：payment_id + 'secretary_work_assignment' + 每个收件人邮箱。
 */
export async function dispatchSecretaryAssignmentSafe(
  applicationId: string,
  paymentId: string
): Promise<void> {
  try {
    if (!isEmailConfigured()) {
      console.warn('[email] RESEND_API_KEY not set — skip secretary assignment (payment unaffected)');
      return;
    }
    const data = await loadEmailData(applicationId, paymentId);
    if (!data) {
      console.warn(`[email] secretary assignment: no data app=${applicationId}`);
      return;
    }
    // 去重收件人（admin email 可能本就是 info@）。
    const admin = getAdminEmail();
    const recipients = Array.from(
      new Set([...(admin ? [admin] : []), ...SECRETARY_RECIPIENTS].map((e) => e.trim().toLowerCase()))
    );
    const { subject, html, text } = buildSecretaryAssignment(data);
    for (const to of recipients) {
      const claimId = await claim(applicationId, paymentId, 'secretary_work_assignment', to, 'secretary');
      if (!claimId) continue; // 已发过,幂等跳过
      const r = await sendClaimed(claimId, to, subject, html, text);
      console.log(`[email] secretary assignment app=${applicationId} to=${maskEmail(to)} -> ${r}`);
    }
  } catch (e) {
    console.error('[email] secretary assignment error (ignored):', e instanceof Error ? e.message : 'unknown');
  }
}

/**
 * 秘书点「已通过」后发「入会欢迎」邮件给申请人。永不抛错。
 * 幂等键：payment_id + 'member_welcome' + 申请人邮箱。
 */
export async function dispatchWelcomeEmailSafe(applicationId: string): Promise<void> {
  try {
    if (!isEmailConfigured()) {
      console.warn('[email] RESEND_API_KEY not set — skip welcome email');
      return;
    }
    const paymentId = await resolveLatestPaidPaymentId(applicationId);
    if (!paymentId) {
      console.warn(`[email] welcome: no paid payment app=${applicationId}`);
      return;
    }
    const data = await loadEmailData(applicationId, paymentId);
    if (!data) {
      console.warn(`[email] welcome: no data app=${applicationId}`);
      return;
    }
    const claimId = await claim(applicationId, paymentId, 'member_welcome', data.email, 'applicant');
    if (!claimId) return; // 已发过
    const { subject, html, text } = buildWelcomeEmail(data);
    const r = await sendClaimed(claimId, data.email, subject, html, text);
    console.log(`[email] welcome app=${applicationId} to=${maskEmail(data.email)} -> ${r}`);
  } catch (e) {
    console.error('[email] welcome email error (ignored):', e instanceof Error ? e.message : 'unknown');
  }
}

function maskEmail(e: string): string {
  return e.replace(/(^.).*(@.*$)/, '$1***$2');
}
