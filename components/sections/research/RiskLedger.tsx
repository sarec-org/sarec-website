import styles from './RiskLedger.module.css';

/**
 * RiskLedger — 替代 MistakesGrid
 * 2 列 × N 行 grid + 大编号 + 金线 + 大留白
 */
export type RiskLedgerProps = {
  eyebrow: string;
  title: string;
  items: string[];
};

export function RiskLedger({ eyebrow, title, items }: RiskLedgerProps) {
  if (!items || items.length === 0) return null;
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        <ol className={styles.grid}>
          {items.map((item, i) => (
            <li key={item} className={styles.cell}>
              <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.divider} aria-hidden="true" />
              <p className={styles.text}>{item}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
