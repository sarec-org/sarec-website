import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import {
  listMembershipTiers,
  formatCents,
  MEMBERSHIP_CARD_SLUGS,
  MEMBERSHIP_TIER_CONTENT,
  coreBenefits,
  getTierSeed,
  getStrategicPartnerTier,
  PROMOTION_DISCLAIMER,
  COMPLIANCE_FOOTNOTE
} from '@/lib/membership/tiers';
import { JoinForm } from '@/components/membership/JoinForm';
import styles from '@/components/membership/membership.module.css';

export const metadata: Metadata = createPageMetadata({
  title: '加入 SAREC｜在线入会申请',
  description:
    'SAREC 中美房地产商会在线入会申请：会员 $200、理事单位 $500、常务理事单位 $1,000、副会长单位 $3,000。2026 年度推广价限时开放。',
  path: '/zh/join'
});

// 价格与权益均来自唯一数据源 lib/membership/tiers.ts（页面不硬编码价格或权益文案）。
export default function JoinPage() {
  const tiers = listMembershipTiers();
  const sp = getStrategicPartnerTier();
  const formTiers = tiers
    .filter((t) => t.isActive)
    .map((t) => ({
      slug: t.slug,
      nameZh: t.nameZh,
      currentPriceLabel: formatCents(t.currentPriceCents)
    }));

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>MEMBERSHIP · 在线入会</p>
      <h1 className={styles.h1}>加入 SAREC 中美房地产商会</h1>
      <p className={styles.lead}>
        SAREC 面向中美跨境房地产的机构与专业力量，提供会员身份、展示机会、活动权益与资源协同。
        在线选择档位、了解权益、填写资料并同意入会协议，即可进入下一步付款。
      </p>

      {/* Launch Rate 免责说明 —— 紧贴价格卡上方，复用价格源既有定稿 */}
      <div className={styles.promoNote}>
        <p>{PROMOTION_DISCLAIMER.en}</p>
        <p>{PROMOTION_DISCLAIMER.zh}</p>
      </div>

      <h2 className={styles.sectionH2}>四档会员 · 2026 Launch Rate</h2>
      <div className={styles.tierGrid}>
        {MEMBERSHIP_CARD_SLUGS.map((slug) => {
          const tier = getTierSeed(slug);
          if (!tier) return null;
          const content = MEMBERSHIP_TIER_CONTENT[slug];
          const hasPromo =
            tier.isPromotionActive && tier.currentPriceCents < tier.standardPriceCents;
          return (
            <article key={slug} className={styles.tierCard}>
              <h3 className={styles.tierName}>{tier.nameZh}</h3>
              <p className={styles.tierNameEn}>{tier.nameEn}</p>

              {hasPromo && <span className={styles.promoTag}>2026 Launch Rate</span>}
              <div className={styles.priceRow}>
                <span className={styles.priceCurrent}>{formatCents(tier.currentPriceCents)}</span>
                {hasPromo && (
                  <span className={styles.priceStandard}>
                    {formatCents(tier.standardPriceCents)}
                  </span>
                )}
              </div>
              <p className={styles.priceTerm}>/ 年（{tier.membershipTermMonths} 个月会员年度）</p>

              <p className={styles.tierTagline}>{content.positioningZh}</p>
              <ul className={styles.benefitList}>
                {coreBenefits(slug).map((item, i) => (
                  <li key={i}>
                    {item.text}
                    {item.reviewGated && <span className={styles.gatedMark}> ＊</span>}
                  </li>
                ))}
              </ul>

              <div className={styles.tierCta}>
                <a href="#apply" className={styles.btnLink}>
                  选择此档位 →
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.reviewNote}>
        完整分档权益对比见{' '}
        <Link href="/zh/membership">会员权益说明</Link>。＊ {COMPLIANCE_FOOTNOTE}
      </p>

      {/* 战略合作伙伴明显入口（非普通会员层级） */}
      <div className={styles.partnerCallout}>
        <div>
          <h2 className={styles.partnerCalloutH2}>战略合作伙伴</h2>
          <p className={styles.partnerCalloutBody}>
            面向律师、会计、保险、贷款、券商、财富管理、地产经纪、开发商、建筑、装修、材料等专业机构。
            {sp &&
              `${formatCents(sp.currentPriceCents)} / 年，或 ${formatCents(
                sp.firstPaymentAmountCents ?? 0
              )} + ${formatCents(sp.secondPaymentAmountCents ?? 0)} 半年两期。`}
          </p>
        </div>
        <Link href="/zh/strategic-partners" className={styles.btnLink}>
          了解战略合作伙伴 →
        </Link>
      </div>

      <h2 className={styles.sectionH2} id="apply">
        在线申请
      </h2>
      <JoinForm tiers={formTiers} />

      <p className={styles.reviewNote}>付款由 Stripe 安全处理。</p>
    </div>
  );
}
