import styles from './PullQuote.module.css';

/**
 * PullQuote — 100vw 居中大字引文
 */
export type PullQuoteProps = {
  text: string;
  attribution?: string;
  variant?: 'default' | 'long';
};

export function PullQuote({ text, attribution, variant = 'default' }: PullQuoteProps) {
  const figureClass = `${styles.figure} ${variant === 'long' ? styles.figureLong : ''}`;
  const quoteClass = `${styles.quote} ${variant === 'long' ? styles.quoteLong : ''}`;
  return (
    <section className={styles.section}>
      <figure className={figureClass}>
        <blockquote className={quoteClass}>{text}</blockquote>
        {attribution ? (
          <figcaption className={styles.attribution}>{attribution}</figcaption>
        ) : null}
      </figure>
    </section>
  );
}
