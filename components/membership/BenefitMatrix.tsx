import {
  MEMBERSHIP_CARD_SLUGS,
  MEMBERSHIP_TIER_CONTENT,
  tierFullBenefits,
  COMPLIANCE_FOOTNOTE,
  getTierSeed,
  formatCents
} from '@/lib/membership/tiers';
import styles from './BenefitMatrix.module.css';

/**
 * 四档普通会员权益对比 —— 每列一档,列出该档【完整】权益(逐级叠加派生),
 * 并高亮「本档新增」项,一眼看出升级差异。数据全部来自单一源(tierFullBenefits)。
 * 移动端整表横向滚动,页面本身不横向溢出。战略合作伙伴不在此表(单独页)。
 */
export function BenefitMatrix() {
  const cols = MEMBERSHIP_CARD_SLUGS.map((slug) => ({
    slug,
    seed: getTierSeed(slug),
    focusZh: MEMBERSHIP_TIER_CONTENT[slug].focusZh,
    full: tierFullBenefits(slug)
  })).filter((c) => c.seed);

  return (
    <div className={styles.wrap}>
      <div className={styles.scroll} role="region" aria-label="四档会员权益对比" tabIndex={0}>
        <div className={styles.grid}>
          {cols.map(({ slug, seed, focusZh, full }) => {
            const t = seed!;
            const promo = t.isPromotionActive && t.currentPriceCents < t.standardPriceCents;
            return (
              <div key={slug} className={styles.col}>
                <div className={styles.colHead}>
                  <span className={styles.colName}>{t.nameZh}</span>
                  <span className={styles.colPrice}>
                    {formatCents(t.currentPriceCents)}
                    <span className={styles.colTerm}> / 年</span>
                  </span>
                  {promo && (
                    <span className={styles.colStandard}>
                      原价 {formatCents(t.standardPriceCents)}
                    </span>
                  )}
                  <span className={styles.colFocus}>{focusZh}</span>
                </div>
                <ul className={styles.colList}>
                  {full.map((b, i) => {
                    const isNew = b.addedAt === slug && slug !== 'member';
                    return (
                      <li
                        key={i}
                        className={`${styles.colItem} ${isNew ? styles.colItemNew : ''}`}
                      >
                        {isNew && <span className={styles.newTag}>本档新增</span>}
                        {b.text}
                        {b.reviewGated && (
                          <span className={styles.gate} aria-hidden="true">
                            {' '}
                            ＊
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <p className={styles.note}>＊ {COMPLIANCE_FOOTNOTE}</p>
    </div>
  );
}
