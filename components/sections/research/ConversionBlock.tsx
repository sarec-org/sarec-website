import Link from 'next/link';
import styles from './ConversionBlock.module.css';

/**
 * ConversionBlock — 3 列意图分流 + 底部 contactLine
 * 上下金线 / 100vw
 */
export type ConversionBlockProps = {
  question: string;
  intents: Array<{ label: string; ctaText: string; href: string }>;
  contactLine: string;
};

export function ConversionBlock({
  question,
  intents,
  contactLine
}: ConversionBlockProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.question}>{question}</h2>
        <ul className={styles.grid}>
          {intents.map((intent) => (
            <li key={intent.href} className={styles.col}>
              <p className={styles.label}>{intent.label}</p>
              <span className={styles.divider} aria-hidden="true" />
              <Link href={intent.href} className={styles.cta}>
                {intent.ctaText}
              </Link>
            </li>
          ))}
        </ul>
        <p className={styles.contact}>{contactLine}</p>
      </div>
    </section>
  );
}
