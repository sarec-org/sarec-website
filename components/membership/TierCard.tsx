import {
  getTierSeed,
  MEMBERSHIP_TIER_CONTENT,
  tierFullBenefits,
  tierAddedBenefits,
  formatCents,
  type MembershipCardSlug
} from '@/lib/membership/tiers';
import styles from './TierCard.module.css';

/**
 * 统一档位卡（/zh/join 与 /zh/membership 共用,保证两页展示完全一致）。
 * 结构：档位名称 / 价格 / 定位 / 全部权益（逐级累加,逐条全部可见,不折叠） /
 *       本档新增·升级重点（辅助） / 申请按钮。
 * 全部权益与新增权益均由单一数据源程序化派生（tierFullBenefits / tierAddedBenefits）。
 * variant='compact' 供 /zh/join 用更紧凑排版；内容(完整权益)两页一致。
 */
export function TierCard({
  slug,
  variant = 'full'
}: {
  slug: MembershipCardSlug;
  variant?: 'full' | 'compact';
}) {
  const tier = getTierSeed(slug);
  if (!tier) return null;
  const content = MEMBERSHIP_TIER_CONTENT[slug];
  const isMember = slug === 'member';
  const promo = tier.isPromotionActive && tier.currentPriceCents < tier.standardPriceCents;
  const added = tierAddedBenefits(slug);
  // 已包含权益 = 完整权益中【不属于本档新增】的部分（即下级各档权益,逐条列出,无重叠）。
  const inherited = tierFullBenefits(slug).filter((b) => b.addedAt !== slug);

  return (
    <article className={`${styles.card} ${variant === 'compact' ? styles.compact : ''}`}>
      <h3 className={styles.name}>{tier.nameZh}</h3>
      <p className={styles.en}>{tier.nameEn}</p>

      {promo && <span className={styles.promoTag}>2026 Launch Rate</span>}
      <div className={styles.priceRow}>
        <span className={styles.priceCurrent}>{formatCents(tier.currentPriceCents)}</span>
        {promo && (
          <span className={styles.priceStandard}>原价 {formatCents(tier.standardPriceCents)}</span>
        )}
      </div>
      <p className={styles.term}>/ 年（{tier.membershipTermMonths} 个月会员年度）</p>

      <p className={styles.positioning}>{content.positioningZh}</p>

      {/* 已包含权益（下级各档权益,逐条列出;member 无此块,直接显示「基础权益」）—— 不折叠 */}
      {isMember ? (
        <>
          <p className={styles.sectionLabel}>基础权益</p>
          <ul className={styles.list}>
            {added.map((b, i) => (
              <li key={i} className={styles.item}>
                {b.text}
                {b.reviewGated && (
                  <span className={styles.gate} aria-hidden="true">
                    {' '}
                    ＊
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className={styles.sectionLabel}>已包含权益</p>
          <ul className={styles.list}>
            {inherited.map((b, i) => (
              <li key={i} className={styles.item}>
                {b.text}
                {b.reviewGated && (
                  <span className={styles.gate} aria-hidden="true">
                    {' '}
                    ＊
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* 本档新增 / 升级重点 —— 只列本档新增,不与「已包含」重复 */}
          <p className={styles.addedLabel}>本档新增 / 升级重点</p>
          <ul className={styles.addedList}>
            {added.map((b, i) => (
              <li key={i} className={styles.addedItem}>
                {b.text}
                {b.reviewGated && (
                  <span className={styles.gate} aria-hidden="true">
                    {' '}
                    ＊
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.cta}>
        <a href={`/zh/join?tier=${slug}#apply`} className={styles.btn}>
          申请{tier.nameZh} →
        </a>
      </div>
    </article>
  );
}
