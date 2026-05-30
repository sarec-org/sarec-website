import Link from 'next/link';
import { RevealOnView } from '@/components/shared/RevealOnView';
import styles from './ArticleCTA.module.css';

/**
 * ArticleCTA — Research 文章底部 CTA Banner
 * 上下金线 + 黑底 + 双 CTA(教训 P5-CTA-Visual-01:keep-all + overflow-wrap)
 */
export type ArticleCTAProps = {
  title: string;
  subtitle?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function ArticleCTA({
  title,
  subtitle,
  primaryCta,
  secondaryCta
}: ArticleCTAProps) {
  return (
    <section className={styles.cta}>
      <div className={styles.inner}>
        <RevealOnView as="h2" className={styles.h2}>
          {title}
        </RevealOnView>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        <div className={styles.row}>
          <Link href={primaryCta.href} className={styles.primary}>
            {primaryCta.label}
          </Link>
          {secondaryCta ? (
            <Link href={secondaryCta.href} className={styles.secondary}>
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
