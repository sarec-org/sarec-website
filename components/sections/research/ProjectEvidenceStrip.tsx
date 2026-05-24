import Link from 'next/link';
import styles from './ProjectEvidenceStrip.module.css';

/**
 * ProjectEvidenceStrip — 替代 CaseLensTriple
 * 100vw / 1440 / 暗一档背景 / 3 列 grid + ASSET 编号头 + 可选 link
 */
export type ProjectEvidenceStripProps = {
  eyebrow: string;
  title: string;
  cases: Array<{ name: string; tag: string; body: string; href?: string }>;
};

export function ProjectEvidenceStrip({
  eyebrow,
  title,
  cases
}: ProjectEvidenceStripProps) {
  if (!cases || cases.length === 0) return null;
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.grid}>
          {cases.map((c, i) => (
            <article key={c.name} className={styles.card}>
              <header className={styles.cardHeader}>
                <span className={styles.assetLabel}>
                  ASSET {String(i + 1).padStart(2, '0')}
                </span>
                <span className={styles.cardLine} aria-hidden="true" />
              </header>
              <h3 className={styles.name}>{c.name}</h3>
              <p className={styles.tag}>{c.tag}</p>
              <p className={styles.body}>{c.body}</p>
              {c.href ? (
                <Link href={c.href} className={styles.link}>
                  → 查看案例
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
