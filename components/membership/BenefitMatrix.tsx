import {
  MEMBERSHIP_CARD_SLUGS,
  MEMBERSHIP_TIER_CONTENT,
  COMPLIANCE_FOOTNOTE,
  getTierSeed,
  formatCents
} from '@/lib/membership/tiers';
import styles from './BenefitMatrix.module.css';

/**
 * 四档普通会员权益对比 —— 每列一档，完整列出该档权益（非 ✓/— 表格）。
 * 数据全部来自单一源 MEMBERSHIP_TIER_CONTENT；价格由 formatCents 从价格源渲染。
 * 移动端整表横向滚动，页面本身不横向溢出。战略合作伙伴不在此表（单独页）。
 */
export function BenefitMatrix() {
  const cols = MEMBERSHIP_CARD_SLUGS.map((slug) => ({
    slug,
    seed: getTierSeed(slug),
    content: MEMBERSHIP_TIER_CONTENT[slug]
  })).filter((c) => c.seed);

  return (
    <div className={styles.wrap}>
      <div className={styles.scroll} role="region" aria-label="四档会员权益对比" tabIndex={0}>
        <div className={styles.grid}>
          {cols.map(({ slug, seed, content }) => {
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
                  <span className={styles.colFocus}>{content.focusZh}</span>
                </div>
                <ul className={styles.colList}>
                  {content.benefits.map((b, i) => (
                    <li key={i} className={styles.colItem}>
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
              </div>
            );
          })}
        </div>
      </div>

      <p className={styles.note}>＊ {COMPLIANCE_FOOTNOTE}</p>
    </div>
  );
}
