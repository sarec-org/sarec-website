/**
 * GEO · J 研究页区块：开头「直接回答」段 / 文末「English summary」英文对照区。
 * ------------------------------------------------------------------
 * - 纯展示组件：内容由 caller 以 props 传入，不 import 访问层。
 * - GEO 文章（GeoArticleRenderer）与旧版手写研究页（ResearchGeoTail）共用。
 * - English summary 整块 lang="en"，便于读者与搜索 / AI 引擎识别语言。
 */
import type { ReactElement } from 'react';
import type { EnglishSummary as EnglishSummaryData } from '@/lib/geo/types';
import styles from './GeoAnswerSections.module.css';

export function DirectAnswer(props: { text?: string; byline?: string }): ReactElement | null {
  if (!props.text) return null;
  return (
    <section className={styles.directAnswer} aria-label="直接回答" data-geo-direct-answer>
      <p className={styles.directLabel}>直接回答</p>
      {props.text.split('\n').filter(Boolean).map((p, i) => (
        <p key={i} className={styles.directText}>
          {p}
        </p>
      ))}
      {props.byline ? <p className={styles.directByline}>{props.byline}</p> : null}
    </section>
  );
}

export function EnglishSummary(props: {
  data?: EnglishSummaryData;
  byline?: string;
  disclaimer?: string;
}): ReactElement | null {
  const { data } = props;
  if (!data) return null;
  return (
    <section className={styles.english} lang="en" aria-label="English summary" data-geo-english-summary>
      <p className={styles.englishLabel}>English summary</p>
      <h2 className={styles.englishTitle}>{data.title}</h2>
      {props.byline ? <p className={styles.englishByline}>{props.byline}</p> : null}
      <p className={styles.englishAnswerLabel}>Short answer</p>
      <p className={styles.englishAnswer}>{data.directAnswer}</p>
      {data.faq.length > 0 ? (
        <>
          <h3 className={styles.englishFaqTitle}>Questions &amp; answers</h3>
          <dl className={styles.englishFaq}>
            {data.faq.map((f, i) => (
              <div key={i} className={styles.englishFaqItem}>
                <dt>{f.question}</dt>
                <dd>{f.answer}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
      {props.disclaimer ? <p className={styles.englishDisclaimer}>{props.disclaimer}</p> : null}
    </section>
  );
}
