import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import {
  getStrategicPartnerTier,
  formatCents,
  STRATEGIC_PARTNER_CONTENT,
  COMPLIANCE_FOOTNOTE,
  STRATEGIC_PARTNER_INDUSTRIES
} from '@/lib/membership/tiers';
import { PartnerForm } from '@/components/membership/PartnerForm';
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
  const content = STRATEGIC_PARTNER_CONTENT;

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
        战略合作伙伴不是普通会员层级，而是面向专业服务机构的深度合作 ——
        官网展示、联合内容与活动、专题推介与资源协同。合作权益须经 SAREC 审核、排期与内容标准确认。
      </p>

      <h2 className={styles.sectionH2}>适合谁</h2>
      <p className={styles.lead}>{content.positioningZh}</p>
      <ul className={styles.industryList}>
        {STRATEGIC_PARTNER_INDUSTRIES.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>

      <h2 className={styles.sectionH2}>合作权益</h2>
      <ul className={styles.benefitList}>
        {content.benefits.map((item, i) => (
          <li key={i}>
            {item.text}
            {item.reviewGated && <span className={styles.gatedMark}> ＊</span>}
          </li>
        ))}
      </ul>
      <p className={styles.reviewNote}>＊ {COMPLIANCE_FOOTNOTE}</p>

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

      <h2 className={styles.sectionH2}>在线申请</h2>
      <PartnerForm
        industries={STRATEGIC_PARTNER_INDUSTRIES}
        fullPriceLabel={formatCents(tier.currentPriceCents)}
        firstPaymentLabel={formatCents(tier.firstPaymentAmountCents ?? 0)}
        secondPaymentLabel={formatCents(tier.secondPaymentAmountCents ?? 0)}
        supportsSemiAnnual={tier.supportsSemiAnnual}
      />

      <p className={styles.reviewNote}>
        付款由 Stripe 安全处理。会员档位请见 <Link href="/zh/join">加入 SAREC</Link>。
      </p>
    </div>
  );
}
