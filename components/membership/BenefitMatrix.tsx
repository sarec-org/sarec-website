import {
  MATRIX_TIER_SLUGS,
  BENEFIT_MATRIX,
  BENEFIT_MATRIX_NOTE,
  getTierSeed,
  getStrategicPartnerTier,
  formatCents
} from '@/lib/membership/tiers';
import styles from './BenefitMatrix.module.css';

/**
 * 会员权益对比矩阵（会员 / 理事单位 / 常务理事单位 / 副会长单位）。
 * 价格从唯一价格源 tiers.data.json 经 formatCents 渲染，组件不硬编码任何金额。
 * /zh/join 与 /zh/membership 共用；移动端表格横向滚动，不撑破页面。
 */
export function BenefitMatrix() {
  const cols = MATRIX_TIER_SLUGS.map((slug) => getTierSeed(slug)).filter(
    (t): t is NonNullable<typeof t> => Boolean(t)
  );
  const sp = getStrategicPartnerTier();

  return (
    <div className={styles.wrap}>
      <div className={styles.scroll} role="region" aria-label="会员权益对比表" tabIndex={0}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.rowHead}>
                权益项目 / Benefit
              </th>
              {cols.map((t) => {
                const promo =
                  t.isPromotionActive && t.currentPriceCents < t.standardPriceCents;
                return (
                  <th scope="col" key={t.slug} className={styles.colHead}>
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
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {BENEFIT_MATRIX.map((row) => (
              <tr key={row.label}>
                <th scope="row" className={styles.rowHead}>
                  {row.label}
                  {row.reviewGated && (
                    <span className={styles.gate} aria-hidden="true">
                      {' '}
                      ＊
                    </span>
                  )}
                </th>
                {row.cells.map((cell, i) => (
                  <td key={i} className={styles.cell}>
                    {cell === true ? (
                      <span className={styles.yes} aria-label="包含">
                        ✓
                      </span>
                    ) : cell === false ? (
                      <span className={styles.no} aria-label="不包含">
                        —
                      </span>
                    ) : (
                      <span className={styles.partial}>{cell}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.note}>＊ {BENEFIT_MATRIX_NOTE}</p>

      {sp && (
        <p className={styles.spNote}>
          <strong>战略合作伙伴 / Strategic Partner：</strong>
          {formatCents(sp.currentPriceCents)} / 年，或 {formatCents(sp.firstPaymentAmountCents ?? 0)} +{' '}
          {formatCents(sp.secondPaymentAmountCents ?? 0)} 半年两期。面向律师、会计、保险、贷款、券商、
          财富管理、地产经纪、开发商、材料商、装修 / 建筑等专业机构。展示、联合内容与活动、专题推介
          须经 SAREC 审核、排期及内容标准确认。
        </p>
      )}
    </div>
  );
}
