import styles from './PullQuote.module.css';

/**
 * PullQuote — 100vw 居中大字引文
 */
export type PullQuoteProps = {
  text: string;
  attribution?: string;
};

export function PullQuote({ text, attribution }: PullQuoteProps) {
  return (
    <section className={styles.section}>
      <figure className={styles.figure}>
        <blockquote className={styles.quote}>{text}</blockquote>
        {attribution ? (
          <figcaption className={styles.attribution}>{attribution}</figcaption>
        ) : null}
      </figure>
    </section>
  );
}
