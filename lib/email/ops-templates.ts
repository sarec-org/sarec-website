/**
 * 运营工作流邮件模板（秘书工作安排 + 欢迎邮件）。纯函数,返回 { subject, html, text }。
 * 合规安全:不承诺客户/成交/融资/收益;展示/内容/活动一律「须经 SAREC 审核、排期与内容标准确认」。
 */
import { formatCents } from '@/lib/membership/tiers';
import { isUnitTier, isStrategicPartner } from '@/lib/membership/operations';
import type { PaymentEmailData } from './templates';

const ADMIN_URL = 'https://sinoamericanrec.org/admin/memberships';
const REVIEW_NOTE_ZH =
  '以上展示、发言、推介、专访、联合活动及资源协同权益,须经 SAREC 审核、排期及内容标准确认。SAREC 不承诺客户数量、成交结果、融资结果、投资收益、业务收入或固定客户来源。';

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(
    /[&<>]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string
  );
}

function wrap(title: string, rows: string[]): string {
  return [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;color:#1a1a1a;line-height:1.6">`,
    `<h2 style="font-size:18px;margin:0 0 16px">${esc(title)}</h2>`,
    rows.join('\n'),
    `</div>`
  ].join('\n');
}

function kv(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#777;vertical-align:top;white-space:nowrap">${esc(
    label
  )}</td><td style="padding:4px 0">${esc(value)}</td></tr>`;
}

function ol(items: string[]): string {
  return `<ol style="margin:0 0 12px;padding-left:20px">${items
    .map((i) => `<li style="margin:2px 0">${esc(i)}</li>`)
    .join('')}</ol>`;
}

function ul(items: string[]): string {
  return `<ul style="margin:0 0 12px;padding-left:20px">${items
    .map((i) => `<li style="margin:2px 0">${esc(i)}</li>`)
    .join('')}</ul>`;
}

function whoOf(d: PaymentEmailData): string {
  return d.companyName || d.contactName || d.email;
}

function validityLine(d: PaymentEmailData): string {
  if (d.membershipStartDate && d.membershipEndDate) {
    return `${d.membershipStartDate} → ${d.membershipEndDate}`;
  }
  return '待确认';
}

// ── 秘书工作安排邮件（付款成功后发 info@ + 东哥）───────────────────
export function buildSecretaryAssignment(d: PaymentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const who = whoOf(d);
  const amount = formatCents(d.amountCents);
  const needsOwner = !(d.applicationType === 'membership' && d.tierSlug === 'member');

  const subject = `【SAREC 新会员待审核】${d.tierNameZh} - ${who} - ${amount}`;

  const info = [
    kv('档位', `${d.tierNameZh}（${d.tierNameEn}）`),
    kv('金额', amount),
    kv('姓名 / 单位名称', who),
    kv('邮箱', d.email),
    kv('电话', d.phone || '未填写'),
    kv('会员有效期', validityLine(d)),
    kv('当前状态', '已付款 / 待审核')
  ].join('');

  const nextSteps = ol([
    '核对申请资料',
    '普通会员资料完整可准备通过',
    '理事单位及以上需提交东哥确认',
    '通过后发送欢迎邮件',
    '单位会员需收集 Logo、公司简介、官网链接、牌匾抬头'
  ]);

  const rows = [
    `<p style="margin:0 0 12px">收到一笔新的会员付款,已进入秘书运营工作流。</p>`,
    `<table style="border-collapse:collapse;font-size:14px;margin:0 0 16px">${info}</table>`,
    needsOwner
      ? `<p style="margin:0 0 12px;color:#b45309"><strong>提示:该档位需东哥确认后批准。</strong></p>`
      : `<p style="margin:0 0 12px;color:#166534"><strong>提示:普通会员,秘书可初审;资料完整可准备通过。</strong></p>`,
    `<p style="margin:0 0 4px;color:#555">秘书下一步工作:</p>`,
    nextSteps,
    `<p style="margin:0 0 12px">后台处理入口:<a href="${ADMIN_URL}">${ADMIN_URL}</a></p>`
  ];

  const text = [
    subject,
    '',
    `档位: ${d.tierNameZh} (${d.tierNameEn})`,
    `金额: ${amount}`,
    `姓名/单位名称: ${who}`,
    `邮箱: ${d.email}`,
    `电话: ${d.phone || '未填写'}`,
    `会员有效期: ${validityLine(d)}`,
    `当前状态: 已付款 / 待审核`,
    needsOwner ? '提示: 需东哥确认后批准' : '提示: 普通会员,资料完整可准备通过',
    '',
    '秘书下一步工作:',
    '1. 核对申请资料',
    '2. 普通会员资料完整可准备通过',
    '3. 理事单位及以上需提交东哥确认',
    '4. 通过后发送欢迎邮件',
    '5. 单位会员需收集 Logo、公司简介、官网链接、牌匾抬头',
    '',
    `后台处理入口: ${ADMIN_URL}`
  ].join('\n');

  return { subject, html: wrap('SAREC 新会员待审核 · 秘书工作安排', rows), text };
}

// ── 欢迎邮件（点击「已通过」后发申请人）───────────────────────────
export function buildWelcomeEmail(d: PaymentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const who = d.contactName || d.companyName || d.email;
  const validity = validityLine(d);
  const partner = isStrategicPartner(d.applicationType);
  const unit = !partner && isUnitTier(d.tierSlug);

  const rows: string[] = [`<p style="margin:0 0 12px">${esc(who)} 您好,欢迎加入 SAREC 中美房地产商会。</p>`];
  const text: string[] = [`${who} 您好,欢迎加入 SAREC 中美房地产商会。`, ''];

  if (partner) {
    rows.push(`<p style="margin:0 0 12px">您的战略合作伙伴合作年度为 <strong>${esc(validity)}</strong>。</p>`);
    rows.push(`<p style="margin:0 0 4px;color:#555">为启动合作,请补充以下资料:</p>`);
    rows.push(
      ul([
        '公司 Logo（矢量或高清 PNG）',
        '公司简介',
        '专业服务类别',
        '希望合作方向',
        '讲座 / 内容 / 活动合作主题'
      ])
    );
    text.push(
      `合作年度: ${validity}`,
      '请补充: 公司 Logo、公司简介、专业服务类别、希望合作方向、讲座/内容/活动合作主题'
    );
  } else if (unit) {
    rows.push(`<p style="margin:0 0 12px">您的会员有效期为 <strong>${esc(validity)}</strong>。</p>`);
    rows.push(`<p style="margin:0 0 4px;color:#555">为完成单位会员入会,请补充以下资料:</p>`);
    rows.push(ul(['公司 Logo（矢量或高清 PNG）', '公司简介', '官网链接', '牌匾抬头', '联系人信息']));
    text.push(
      `会员有效期: ${validity}`,
      '请补充: 公司 Logo、公司简介、官网链接、牌匾抬头、联系人信息'
    );
  } else {
    // 普通会员
    rows.push(`<p style="margin:0 0 12px">您的会员有效期为 <strong>${esc(validity)}</strong>。</p>`);
    rows.push(
      ul([
        '后续 SAREC 活动、讲座与沙龙将通过邮件通知您',
        '您可加入 SAREC 会员通知群,及时获取活动与资讯'
      ])
    );
    text.push(
      `会员有效期: ${validity}`,
      '后续活动/讲座将邮件通知;可加入 SAREC 会员通知群。'
    );
  }

  if (partner || unit) {
    rows.push(`<p style="margin:16px 0 0;font-size:12px;color:#777">${esc(REVIEW_NOTE_ZH)}</p>`);
    text.push('', REVIEW_NOTE_ZH);
  }

  rows.push(
    `<p style="margin:16px 0 0;font-size:12px;color:#777">如有疑问,请通过 https://sinoamericanrec.org/zh/contact 联系 SAREC。</p>`
  );
  text.push('', '如有疑问,请通过 https://sinoamericanrec.org/zh/contact 联系 SAREC。');

  const subject = partner
    ? 'SAREC — 战略合作伙伴入会欢迎 / Welcome'
    : 'SAREC — 会员入会欢迎 / Welcome';

  return { subject, html: wrap(subject, rows), text: text.join('\n') };
}
