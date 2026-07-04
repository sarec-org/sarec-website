/**
 * 提醒邮件模板（会员到期 / semiAnnual 第二期），中英双语·英文在前。
 * 合规安全：不承诺客户/成交/融资/收益；不写自动续费/自动扣款。
 * 纯函数，返回 { subject, html, text }。
 */
import { SAREC_REVIEW_NOTE } from '@/lib/membership/tiers';

export type ReminderNode = '30_days' | '7_days' | 'today';

export type ReminderEmailData = {
  applicationId: string;
  applicationType: string;
  companyName: string | null;
  contactName: string | null;
  email: string;
  phone: string | null;
  tierNameEn: string;
  tierNameZh: string;
  paymentStatus: string;
  applicationStatus: string;
  membershipEndDate: string | null;
  secondPaymentDueDate: string | null;
  secondPaymentDueDateSource: string | null;
  secondPaymentDueDateNote: string | null;
  firstPaymentPaidAt: string | null;
  secondPaymentPaidAt: string | null;
};

const CONTACT_EN = 'Questions or to renew? Contact SAREC at https://sinoamericanrec.org/zh/contact';
const CONTACT_ZH = '如需续费或有疑问，请通过 https://sinoamericanrec.org/zh/contact 联系 SAREC。';
const JOIN_URL = 'https://sinoamericanrec.org/zh/join';

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
}
function p(en: string, zh: string): string {
  return `<p style="margin:0 0 12px">${esc(en)}<br><span style="color:#555">${esc(zh)}</span></p>`;
}
function kv(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#777;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:4px 0">${esc(value)}</td></tr>`;
}
function wrap(title: string, rows: string[]): string {
  return [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.6">`,
    `<h2 style="font-size:18px;margin:0 0 16px">${esc(title)}</h2>`,
    rows.join('\n'),
    `<hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0">`,
    `<p style="font-size:12px;color:#777">${esc(CONTACT_EN)}<br>${esc(CONTACT_ZH)}</p>`,
    `</div>`
  ].join('\n');
}
function toText(rows: string[], subject: string): string {
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
  return `${subject}\n\n${body}\n\n${CONTACT_EN}\n${CONTACT_ZH}`;
}

function nodeLabel(node: ReminderNode): { en: string; zh: string } {
  if (node === '30_days') return { en: '30 days before expiry', zh: '到期前 30 天' };
  if (node === '7_days') return { en: '7 days before expiry', zh: '到期前 7 天' };
  return { en: 'due today', zh: '今日到期' };
}
const COMPLIANCE_LINE = p(
  'SAREC does not guarantee any client, transaction, financing, or investment return.',
  'SAREC 不承诺任何客户、成交、融资或投资收益。'
);
const REVIEW_LINE = `<p style="margin:0 0 12px;font-size:13px;color:#777">${esc(SAREC_REVIEW_NOTE.en)}<br>${esc(SAREC_REVIEW_NOTE.zh)}</p>`;

type Email = { subject: string; html: string; text: string };

// ── 会员到期提醒 · 申请人 ─────────────────────────────────────────
export function buildMembershipExpiryApplicant(d: ReminderEmailData, node: ReminderNode): Email {
  const who = d.companyName || d.contactName || d.email;
  const nl = nodeLabel(node);
  const subject = `SAREC membership expiry reminder (${nl.en}) / 会员到期提醒（${nl.zh}）`;
  const rows: string[] = [
    p(`Dear ${who},`, `${who} 您好：`),
    p(
      `This is a reminder that your SAREC membership is approaching its end date (${nl.en}).`,
      `提醒您：您的 SAREC 会员即将到期（${nl.zh}）。`
    ),
    p(
      'To continue, you may re-enroll through the SAREC online enrollment page, or contact the SAREC team for assistance. Membership does not renew automatically.',
      `如需延续，您可通过 SAREC 在线入会页面重新付款，或联系 SAREC 团队协助处理。会员不会自动续费。`
    ),
    `<table style="font-size:14px;border-collapse:collapse;margin:0 0 12px">${[
      kv('Tier / 档位', `${d.tierNameEn} / ${d.tierNameZh}`),
      kv('End date / 到期日', d.membershipEndDate ?? '-'),
      kv('Reminder / 提醒节点', `${nl.en} / ${nl.zh}`),
      kv('Renew / 续费', JOIN_URL)
    ].join('')}</table>`,
    REVIEW_LINE,
    COMPLIANCE_LINE
  ];
  return { subject, html: wrap(subject, rows), text: toText(rows, subject) };
}

// ── 会员到期提醒 · 管理员 ─────────────────────────────────────────
export function buildMembershipExpiryAdmin(d: ReminderEmailData, node: ReminderNode): Email {
  const who = d.companyName || d.contactName || d.email;
  const nl = nodeLabel(node);
  const subject = `SAREC membership expiring — ${who} (${nl.en})`;
  const rows: string[] = [
    p(
      'A membership is approaching expiry. Please follow up on renewal.',
      '有一个会员即将到期，请跟进续费。'
    ),
    `<table style="font-size:13px;border-collapse:collapse;margin:0 0 12px">${[
      kv('applicationId', d.applicationId),
      kv('company / 公司', d.companyName || '-'),
      kv('contact / 联系人', d.contactName || '-'),
      kv('email', d.email),
      kv('phone', d.phone || '-'),
      kv('tier', `${d.tierNameEn} / ${d.tierNameZh}`),
      kv('membershipEndDate', d.membershipEndDate ?? '-'),
      kv('reminderNode', `${nl.en}`),
      kv('paymentStatus', d.paymentStatus),
      kv('applicationStatus', d.applicationStatus)
    ].join('')}</table>`
  ];
  return { subject, html: wrap('SAREC — Membership expiring', rows), text: toText(rows, subject) };
}

// ── 第二期付款提醒 · 申请人 ───────────────────────────────────────
export function buildSecondPaymentApplicant(d: ReminderEmailData, node: ReminderNode): Email {
  const who = d.companyName || d.contactName || d.email;
  const nl = nodeLabel(node);
  const subject = `SAREC second installment reminder (${nl.en}) / 第二期付款提醒（${nl.zh}）`;
  const rows: string[] = [
    p(`Dear ${who},`, `${who} 您好：`),
    p(
      'This is a reminder about the SECOND installment of your SAREC Strategic Partnership (semi-annual plan).',
      '提醒您：这是 SAREC 战略合作伙伴（半年两期）的「第二期」付款提醒。'
    ),
    p(
      'Your first installment has been confirmed. The second installment has NOT yet been confirmed, and it is NOT charged automatically.',
      '您的第一期已确认；第二期尚未确认，且不会自动扣款。'
    ),
    p(
      `Please complete the second installment on or before the due date, or contact SAREC. If your written agreement specifies otherwise, the system record and the agreement between both parties shall govern.`,
      `请在约定到期日前完成第二期付款，或联系 SAREC。如纸面协议另有约定，以系统记录 / 双方协议为准。`
    ),
    `<table style="font-size:14px;border-collapse:collapse;margin:0 0 12px">${[
      kv('Partner / 档位', `${d.tierNameEn} / ${d.tierNameZh}`),
      kv('2nd due date / 第二期到期日', d.secondPaymentDueDate ?? '-'),
      kv('Reminder / 提醒节点', `${nl.en} / ${nl.zh}`)
    ].join('')}</table>`,
    REVIEW_LINE,
    COMPLIANCE_LINE
  ];
  return { subject, html: wrap(subject, rows), text: toText(rows, subject) };
}

// ── 第二期付款提醒 · 管理员 ───────────────────────────────────────
export function buildSecondPaymentAdmin(d: ReminderEmailData, node: ReminderNode): Email {
  const who = d.companyName || d.contactName || d.email;
  const nl = nodeLabel(node);
  const subject = `SAREC 2nd installment due — ${who} (${nl.en})`;
  const rows: string[] = [
    p(
      'A strategic partner second installment is approaching its due date. Please follow up.',
      '有一个战略合作伙伴的第二期付款即将到期，请跟进。'
    ),
    `<table style="font-size:13px;border-collapse:collapse;margin:0 0 12px">${[
      kv('applicationId', d.applicationId),
      kv('company / 公司', d.companyName || '-'),
      kv('contact / 联系人', d.contactName || '-'),
      kv('email', d.email),
      kv('phone', d.phone || '-'),
      kv('secondPaymentDueDate', d.secondPaymentDueDate ?? '-'),
      kv('secondPaymentDueDateSource', d.secondPaymentDueDateSource ?? '-'),
      kv('secondPaymentDueDateNote', d.secondPaymentDueDateNote ?? '-'),
      kv('firstPaymentPaidAt', d.firstPaymentPaidAt ?? '-'),
      kv('secondPaymentPaidAt', d.secondPaymentPaidAt ?? '-'),
      kv('paymentStatus', d.paymentStatus),
      kv('reminderNode', nl.en)
    ].join('')}</table>`
  ];
  return { subject, html: wrap('SAREC — 2nd installment due', rows), text: toText(rows, subject) };
}
