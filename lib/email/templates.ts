/**
 * 付款邮件模板（中英双语，英文在前）。合规安全：
 * 不承诺客户/成交/融资/收益/回报；涉及展示/内容/权益一律加「须经 SAREC 审核」限制。
 * 纯函数，返回 { subject, html, text }，无副作用。
 */
import { formatCents } from '@/lib/membership/tiers';
import { SAREC_REVIEW_NOTE } from '@/lib/membership/tiers';

export type PaymentEmailData = {
  applicationId: string;
  paymentId: string;
  applicationType: 'membership' | 'strategic_partner';
  paymentPlan: string;
  installmentNumber: number;
  tierSlug: string;
  tierNameEn: string;
  tierNameZh: string;
  companyName: string | null;
  contactName: string | null;
  email: string;
  phone: string | null;
  amountCents: number;
  currency: string;
  paymentStatus: string;
  appPaymentStatus: string;
  applicationStatus: string;
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  secondPaymentDueDate: string | null;
  agreementVersion: string;
  agreementHash: string | null;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
};

const CONTACT_LINE_EN = 'Questions? Contact SAREC at https://sinoamericanrec.org/zh/contact';
const CONTACT_LINE_ZH = '如有疑问，请通过 https://sinoamericanrec.org/zh/contact 联系 SAREC。';

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
}

function wrapHtml(title: string, bodyRows: string[]): string {
  return [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.6">`,
    `<h2 style="font-size:18px;margin:0 0 16px">${esc(title)}</h2>`,
    bodyRows.join('\n'),
    `<hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0">`,
    `<p style="font-size:12px;color:#777">${esc(CONTACT_LINE_EN)}<br>${esc(CONTACT_LINE_ZH)}</p>`,
    `</div>`
  ].join('\n');
}

function p(en: string, zh: string): string {
  return `<p style="margin:0 0 12px">${esc(en)}<br><span style="color:#555">${esc(zh)}</span></p>`;
}

function kv(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#777;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:4px 0">${esc(value)}</td></tr>`;
}

// ── 申请人付款确认邮件 ────────────────────────────────────────────
export function buildApplicantConfirmation(d: PaymentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const who = d.companyName || d.contactName || d.email;
  const amount = formatCents(d.amountCents);
  const isSemiAnnualFirst = d.applicationType === 'strategic_partner' && d.paymentPlan === 'semiAnnual';
  const tierLine = `${d.tierNameEn} / ${d.tierNameZh}`;

  const subject = isSemiAnnualFirst
    ? 'SAREC — First installment received / 第一期付款已确认'
    : 'SAREC — Payment confirmed / 付款已确认';

  const rows: string[] = [];
  rows.push(p(`Dear ${who},`, `${who} 您好：`));

  if (isSemiAnnualFirst) {
    rows.push(
      p(
        'We have received your FIRST installment payment for the SAREC Strategic Partnership. This is NOT the full annual amount.',
        '我们已收到您 SAREC 战略合作伙伴的「第一期」付款。这不是全年全款。'
      )
    );
    rows.push(
      p(
        'The second installment is not charged automatically. SAREC will remind and follow up with you before the agreed due date.',
        '第二期不会自动扣款。SAREC 团队将在约定到期日前提醒并与您跟进。'
      )
    );
    rows.push(
      p(
        'Your partnership is now entering manual review and arrangement.',
        '您的合作伙伴身份现进入人工审核与安排阶段。'
      )
    );
  } else if (d.applicationType === 'strategic_partner') {
    rows.push(
      p(
        'We have received your annual SAREC Strategic Partnership fee. Your partnership year has started.',
        '我们已收到您的 SAREC 年度战略合作伙伴费用。您的合作年度已开始。'
      )
    );
    rows.push(
      p(
        'SAREC will review your information and contact you to arrange partner visibility and benefits.',
        'SAREC 团队将审核您的资料，并联系确认合作伙伴展示与权益安排。'
      )
    );
  } else {
    rows.push(
      p(
        'Your SAREC membership payment is confirmed. Your membership year has started.',
        '您的 SAREC 会员付款已确认，会员年度已开始。'
      )
    );
    rows.push(
      p(
        'SAREC will review your information and contact you to arrange visibility and benefits.',
        'SAREC 团队将审核您的资料，并联系确认展示与权益安排。'
      )
    );
  }

  // 合规限制语（展示/权益类）
  rows.push(
    `<p style="margin:0 0 12px;font-size:13px;color:#777">${esc(SAREC_REVIEW_NOTE.en)}<br>${esc(SAREC_REVIEW_NOTE.zh)}</p>`
  );

  const details: string[] = [
    kv('Tier / 档位', tierLine),
    kv('Amount / 金额', `${amount} ${d.currency.toUpperCase()}`),
    kv('Status / 状态', isSemiAnnualFirst ? 'First installment paid (partially paid) / 第一期已付（部分付款）' : 'Paid / 已付款'),
    kv('Review / 审核', 'Under review / 人工审核中')
  ];
  if (d.membershipStartDate && d.membershipEndDate) {
    details.push(kv('Term / 有效期', `${d.membershipStartDate} → ${d.membershipEndDate}`));
  }
  if (isSemiAnnualFirst && d.secondPaymentDueDate) {
    details.push(kv('2nd installment due / 第二期到期', `${d.secondPaymentDueDate} (to be confirmed by SAREC / 以 SAREC 确认为准)`));
  }
  details.push(kv('Agreement / 协议版本', d.agreementVersion));
  rows.push(`<table style="font-size:14px;border-collapse:collapse;margin:0 0 12px">${details.join('')}</table>`);

  rows.push(
    p(
      'SAREC does not guarantee any client, transaction, financing, or investment return.',
      'SAREC 不承诺任何客户、成交、融资或投资收益。'
    )
  );

  const html = wrapHtml(subject, rows);
  const text = htmlToText(rows, subject);
  return { subject, html, text };
}

// ── 管理员新付款通知邮件 ──────────────────────────────────────────
export function buildAdminNotification(d: PaymentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const who = d.companyName || d.contactName || d.email;
  const subject = `SAREC new paid application — ${who} — ${formatCents(d.amountCents)} (${d.tierSlug}${
    d.paymentPlan === 'semiAnnual' ? ', semiAnnual #1' : ''
  })`;

  const rows: string[] = [];
  rows.push(
    p(
      'A new application has been paid and requires manual review (information, display content, benefit arrangement).',
      '有一笔新付款申请，需人工审核（资料、展示内容、权益安排）。'
    )
  );

  const details: string[] = [
    kv('applicationId', d.applicationId),
    kv('paymentId', d.paymentId),
    kv('applicationType', d.applicationType),
    kv('selectedTierSlug', d.tierSlug),
    kv('paymentPlan', d.paymentPlan),
    kv('installmentNumber', String(d.installmentNumber)),
    kv('company / 公司', d.companyName || '-'),
    kv('contact / 联系人', d.contactName || '-'),
    kv('email', d.email),
    kv('phone', d.phone || '-'),
    kv('amount', `${formatCents(d.amountCents)} ${d.currency.toUpperCase()}`),
    kv('paymentStatus (payment)', d.paymentStatus),
    kv('paymentStatus (application)', d.appPaymentStatus),
    kv('applicationStatus', d.applicationStatus),
    kv('membershipStartDate', d.membershipStartDate || '-'),
    kv('membershipEndDate', d.membershipEndDate || '-'),
    kv('secondPaymentDueDate', d.secondPaymentDueDate || '-'),
    kv('stripeCheckoutSessionId', d.stripeSessionId || '-'),
    kv('stripePaymentIntentId', d.stripePaymentIntentId || '-'),
    kv('agreementVersion', d.agreementVersion),
    kv('agreementHash', d.agreementHash || '-')
  ];
  rows.push(`<table style="font-size:13px;border-collapse:collapse;margin:0 0 12px">${details.join('')}</table>`);
  rows.push(
    `<p style="margin:0 0 12px;font-size:13px;color:#777">${esc(SAREC_REVIEW_NOTE.en)} ${esc(SAREC_REVIEW_NOTE.zh)}</p>`
  );

  const html = wrapHtml('SAREC — New paid application / 新付款申请', rows);
  const text = htmlToText(rows, subject);
  return { subject, html, text };
}

// 粗略 HTML→纯文本（去标签，保留换行），供邮件 text 版。
function htmlToText(rows: string[], subject: string): string {
  const body = rows
    .join('\n')
    .replace(/<\/tr>/g, '\n')
    .replace(/<\/td>/g, ' ')
    .replace(/<br\s*\/?>(\n)?/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return `${subject}\n\n${body}\n\n${CONTACT_LINE_EN}\n${CONTACT_LINE_ZH}`;
}
