import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import {
  getStrategicPartnerTier,
  formatCents,
  TIER_BENEFITS,
  SAREC_REVIEW_NOTE,
  STRATEGIC_PARTNER_INDUSTRIES
} from '@/lib/membership/tiers';
import styles from '@/components/membership/membership.module.css';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 战略合作伙伴｜在线申请',
  description:
    'SAREC 战略合作伙伴：面向保险、律师、会计、贷款、地产经纪、开发商等专业机构的深度合作。支持一次性或半年两期付款。',
  path: '/zh/strategic-partners'
});

// 价格与付款计划均来自唯一价格源 lib/membership/tiers.ts。
export default function StrategicPartnersPage() {
  const tier = getStrategicPartnerTier();
  const benefits = TIER_BENEFITS.strategic_partner;

  if (!tier) {
    return (
      <div className={styles.page}>
        <h1 className={styles.h1}>战略合作伙伴</h1>
        <p className={styles.lead}>档位数据未配置，请联系管理员。</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>STRATEGIC PARTNER · 战略合作伙伴</p>
      <h1 className={styles.h1}>成为 SAREC 战略合作伙伴</h1>
      <p className={styles.lead}>
        战略合作伙伴面向为中美跨境房地产提供专业服务的机构 ——
        深度资源协同、联合内容与活动、官网优先展示。SAREC
        不承诺任何客户、成交、融资或投资收益，合作权益须经 SAREC 审核与排期。
      </p>

      <h2 className={styles.sectionH2}>合作权益</h2>
      <ul className={styles.benefitList}>
        {benefits.benefits.map((item, i) => (
          <li key={i}>
            {item.text}
            {item.gated && <span className={styles.gatedMark}> ＊</span>}
          </li>
        ))}
      </ul>
      <p className={styles.reviewNote}>
        ＊ 标注项：{SAREC_REVIEW_NOTE.zh} / {SAREC_REVIEW_NOTE.en}
      </p>

      <h2 className={styles.sectionH2}>适合的行业</h2>
      <ul className={styles.industryList}>
        {STRATEGIC_PARTNER_INDUSTRIES.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>

      <h2 className={styles.sectionH2}>年度费用与付款方式</h2>
      <div className={styles.planGrid}>
        <div className={styles.planCard}>
          <h3>一次性付清 / Pay in full</h3>
          <p className={styles.planPrice}>{formatCents(tier.currentPriceCents)} / 年</p>
          <p>一次性支付全年战略合作伙伴费用。</p>
        </div>
        {tier.supportsSemiAnnual &&
          tier.firstPaymentAmountCents != null &&
          tier.secondPaymentAmountCents != null && (
            <div className={styles.planCard}>
              <h3>半年两期 / Two semi-annual payments</h3>
              <p className={styles.planPrice}>
                {formatCents(tier.firstPaymentAmountCents)} + {formatCents(tier.secondPaymentAmountCents)}
              </p>
              <p>
                首期 {formatCents(tier.firstPaymentAmountCents)}，第二期
                {formatCents(tier.secondPaymentAmountCents)}（约 6 个月后）。合计与一次性付清相同。
              </p>
              <p>第二期具体日期以 SAREC 确认为准。</p>
            </div>
          )}
      </div>

      <h2 className={styles.sectionH2}>申请资料（骨架）</h2>
      <form className={styles.formSkeleton} aria-label="战略合作伙伴申请骨架（暂不提交）">
        <div className={styles.field}>
          <label htmlFor="company">公司 / 机构名称</label>
          <input id="company" name="company" type="text" disabled placeholder="公司 / 机构名称" />
        </div>
        <div className={styles.field}>
          <label htmlFor="industry">行业分类</label>
          <select id="industry" name="industry" disabled defaultValue="">
            <option value="" disabled>
              请选择
            </option>
            {STRATEGIC_PARTNER_INDUSTRIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="contact">联系人姓名</label>
          <input id="contact" name="contact" type="text" disabled placeholder="联系人姓名" />
        </div>
        <div className={styles.field}>
          <label htmlFor="email">邮箱</label>
          <input id="email" name="email" type="email" disabled placeholder="you@example.com" />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">电话</label>
          <input id="phone" name="phone" type="tel" disabled placeholder="电话" />
        </div>
        <div className={styles.field}>
          <label htmlFor="plan">付款方式</label>
          <select id="plan" name="plan" disabled defaultValue="">
            <option value="" disabled>
              请选择
            </option>
            <option value="full">一次性付清</option>
            {tier.supportsSemiAnnual && <option value="semi_annual">半年两期</option>}
          </select>
        </div>

        <div className={styles.agreeRow}>
          <input type="checkbox" id="agree" disabled aria-describedby="agree-text" />
          <div id="agree-text">
            <p>
              I have read and agree to the{' '}
              <Link href="/legal/strategic-partnership-agreement">
                SAREC Strategic Partnership Agreement
              </Link>{' '}
              and <Link href="/legal/privacy">Privacy Policy</Link>.
            </p>
            <p>
              我已阅读并同意{' '}
              <Link href="/legal/strategic-partnership-agreement">SAREC 战略合作伙伴协议</Link>及
              <Link href="/legal/privacy">隐私政策</Link>。
            </p>
          </div>
        </div>

        <div>
          <button type="button" className={styles.btnDisabled} disabled>
            下一步：付款（下一步开放）/ Continue to payment (coming next)
          </button>
        </div>
      </form>

      <p className={styles.reviewNote}>
        本页为战略合作伙伴在线申请骨架，付款与资料提交将在后续开放。会员档位请见{' '}
        <Link href="/zh/join">加入 SAREC</Link>。
      </p>
    </div>
  );
}
