import { RevealOnView } from '@/components/shared/RevealOnView';
import styles from './OpeningJudgment.module.css';

/**
 * OpeningJudgment — 100vw 段
 * 居中大判断 + 80px 金线 + 760px intro 三段
 */
export type OpeningJudgmentProps = {
  judgment: string;
  introParagraphs: string[];
};

export function OpeningJudgment({
  judgment,
  introParagraphs
}: OpeningJudgmentProps) {
  const judgmentLines = judgment.split('\n');
  const hasManualBreak = judgmentLines.length > 1;
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <RevealOnView
          as="h2"
          className={`${styles.judgment} ${hasManualBreak ? styles.hasManualBreak : ''}`}
        >
          {judgmentLines.map((line, index) => (
            <span
              key={line}
              className={hasManualBreak ? styles.manualLine : undefined}
            >
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </RevealOnView>
        <div className={styles.divider} aria-hidden="true" />
        {introParagraphs && introParagraphs.length > 0 ? (
          <div className={styles.intro}>
            {introParagraphs.map((p) => (
              <p key={p} className={styles.introPara}>
                {p}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
