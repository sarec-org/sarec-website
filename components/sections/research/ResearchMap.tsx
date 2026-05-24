import styles from './ResearchMap.module.css';

/**
 * ResearchMap — 投行 memo 编号索引(非游戏卡片)
 * 横向编号 + em dash + 短关键词 + 细线分隔
 * <a title={fullTitle} aria-label={fullTitle}>(GEO 抓完整章节标题)
 */
export type ResearchMapProps = {
  eyebrow: string;
  title: string;
  items: Array<{ keyword: string; fullTitle: string; anchor: string }>;
};

export function ResearchMap({ eyebrow, title, items }: ResearchMapProps) {
  if (!items || items.length === 0) return null;
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        <ol className={styles.list}>
          {items.map((item, i) => (
            <li key={item.anchor} className={styles.row}>
              <a
                href={`#${item.anchor}`}
                className={styles.link}
                title={item.fullTitle}
                aria-label={item.fullTitle}
              >
                <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.dash} aria-hidden="true">—</span>
                <span className={styles.keyword}>{item.keyword}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
