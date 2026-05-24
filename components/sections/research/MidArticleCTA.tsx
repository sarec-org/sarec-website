import Link from 'next/link';
import styles from './MidArticleCTA.module.css';

/**
 * MidArticleCTA — 上下金线 / 720px 居中 / 单按 gold
 */
export type MidArticleCTAProps = {
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

export function MidArticleCTA({ body, ctaLabel, ctaHref }: MidArticleCTAProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.body}>{body}</p>
        <Link href={ctaHref} className={styles.cta}>
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
