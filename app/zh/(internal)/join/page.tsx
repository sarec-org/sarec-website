import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import {
  listMembershipTiers,
  formatCents,
  TIER_BENEFITS,
  PROMOTION_DISCLAIMER,
  SAREC_REVIEW_NOTE
} from '@/lib/membership/tiers';
import { JoinForm } from '@/components/membership/JoinForm';
import { BenefitMatrix } from '@/components/membership/BenefitMatrix';
import styles from '@/components/membership/membership.module.css';

export const metadata: Metadata = createPageMetadata({
  title: '加入 SAREC｜在线入会申请',
  description:
    'SAREC 中美房地产商会在线入会申请：会员、理事单位、常务理事单位、副会长单位。2026 年度推广价限时开放。',
  path: '/zh/join'
});

// 价格与档位来自唯一价格源 lib/membership/tiers.ts（页面不硬编码任何价格）。
export default function JoinPage() {
  const tiers = listMembershipTiers();
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

      <div className={styles.promoNote}>
        <p>{PROMOTION_DISCLAIMER.en}</p>
        <p>{PROMOTION_DISCLAIMER.zh}</p>
      </div>

      <h2 className={styles.sectionH2}>会员档位与权益梯度</h2>
      <div className={styles.tierGrid}>
        {tiers.map((tier) => {
          const b = TIER_BENEFITS[tier.slug];
          const invite = !tier.isActive; // svp = 仅限邀请
          const hasPromo = tier.isPromotionActive && tier.currentPriceCents < tier.standardPriceCents;
          return (
            <article
              key={tier.slug}
              className={`${styles.tierCard} ${invite ? styles.tierCardInvite : ''}`}
            >
              <h3 className={styles.tierName}>{tier.nameZh}</h3>
              <p className={styles.tierNameEn}>{tier.nameEn}</p>

              {invite ? (
                <span className={styles.inviteTag}>By invitation / 仅限邀请</span>
              ) : (
                <>
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
                </>
              )}

              {b && <p className={styles.tierTagline}>{b.taglineZh}</p>}
              {b && (
                <ul className={styles.benefitList}>
                  {b.benefits.map((item, i) => (
                    <li key={i}>
                      {item.text}
                      {item.gated && <span className={styles.gatedMark}> ＊</span>}
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.tierCta}>
                {invite ? (
                  <span className={styles.btnDisabled}>仅限邀请</span>
                ) : (
                  <a href="#apply" className={styles.btnLink}>
                    选择此档位 →
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.reviewNote}>
        ＊ 标注项：{SAREC_REVIEW_NOTE.zh} / {SAREC_REVIEW_NOTE.en} SAREC
        不承诺任何客户、成交、融资或投资收益，亦不承诺固定客户来源。
      </p>

      <h2 className={styles.sectionH2}>权益对比一览</h2>
      <BenefitMatrix />

      <h2 className={styles.sectionH2}>在线申请</h2>
      <JoinForm tiers={formTiers} />

      <p className={styles.reviewNote}>
        付款由 Stripe 安全处理。战略合作伙伴请见{' '}
        <Link href="/zh/strategic-partners">战略合作伙伴</Link>。
      </p>
    </div>
  );
}
