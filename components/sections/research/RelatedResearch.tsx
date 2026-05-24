import Link from 'next/link';
import styles from './RelatedResearch.module.css';

/**
 * RelatedResearch — 文章末尾独立全宽段
 * 替代 ArticleAside sticky 侧栏。Server Component。
 */
export type RelatedResearchProps = {
  items: Array<{ label: string; href: string; eyebrow?: string }>;
};

export function RelatedResearch({ items }: RelatedResearchProps) {
  if (!items || items.length === 0) return null;
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>RELATED RESEARCH · 相关研究</p>
        <h2 className={styles.title}>继续阅读</h2>
        <div className={styles.grid}>
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={styles.card}>
              {item.eyebrow ? (
                <p className={styles.cardEyebrow}>{item.eyebrow}</p>
              ) : null}
              <h3 className={styles.cardTitle}>{item.label}</h3>
              <span className={styles.cardArrow}>阅读 →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
