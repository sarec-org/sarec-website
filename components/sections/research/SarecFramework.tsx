import styles from './SarecFramework.module.css';

/**
 * SarecFramework — 替代 FrameworkAsymmetric
 * 100vw / 1280 / 上下暗金线 / 0.85fr-1.15fr / 左标题区+底部 STRUCTURE ASSESSMENT
 */
export type SarecFrameworkProps = {
  eyebrow: string;
  title: string;
  body: string;
  bottomTag: string;
  items: string[];
};

export function SarecFramework({
  eyebrow,
  title,
  body,
  bottomTag,
  items
}: SarecFrameworkProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.body}>{body}</p>
          <p className={styles.bottomTag}>{bottomTag}</p>
        </div>
        <ol className={styles.list}>
          {items.map((item, i) => (
            <li key={item} className={styles.row}>
              <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.text}>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
