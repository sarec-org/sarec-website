import { RevealOnView } from '@/components/shared/RevealOnView';
import styles from './ArticleSection.module.css';

/**
 * ArticleSection — Research 文章正文章节组件
 * Server Component(RevealOnView 内部为 client,这里仅嵌套调用)。
 *
 * width variant:
 *   - default (760px) — 纯文字章节
 *   - data    (960px) — 含 points/checks/bullets/table 数据容器
 *   - quote   (1120px) — 含 quote / dataCard 强视觉
 *   - full    (none) — 全宽
 *
 * 章节金线 + 编号 + 11 字段条件渲染。
 */
export type ArticleSectionProps = {
  index?: number | string;
  title: string;
  body?: string;
  paragraphs?: string[];
  note?: string;
  pointsTitle?: string;
  points?: string[];
  checks?: string[];
  summary?: string;
  table?: Array<{ label: string; value: string }>;
  orderedItems?: string[];
  detailItems?: Array<{
    title: string;
    body?: string;
    question?: string;
    method?: string;
    redFlag?: string;
  }>;
  bullets?: string[];
  negativeBullets?: string[];
  quote?: { text: string; attribution?: string };
  dataCard?: { label: string; value: string; note?: string };
  width?: 'narrow' | 'default' | 'data' | 'wide' | 'full';
  id?: string;
};

function formatIndex(index: number | string | undefined): string | null {
  if (index === undefined || index === null) return null;
  if (typeof index === 'string') return index;
  return String(index).padStart(2, '0');
}

const WIDTH_CLASS: Record<NonNullable<ArticleSectionProps['width']>, string> = {
  narrow: 'widthNarrow',
  default: 'widthDefault',
  data: 'widthData',
  wide: 'widthWide',
  full: 'widthFull'
};

export function ArticleSection({
  index,
  title,
  body,
  paragraphs,
  note,
  pointsTitle,
  points,
  checks,
  summary,
  table,
  orderedItems,
  detailItems,
  bullets,
  negativeBullets,
  quote,
  dataCard,
  width = 'default',
  id
}: ArticleSectionProps) {
  const indexLabel = formatIndex(index);
  const widthClass = styles[WIDTH_CLASS[width]];
  return (
    <section
      id={id}
      className={`${styles.section} ${widthClass}`}
    >
      <RevealOnView as="div" className={styles.inner}>
        <header className={styles.header}>
          {indexLabel ? (
            <span className={styles.index}>{indexLabel}</span>
          ) : null}
          <h2 className={styles.h2}>
            {title.split('\n').map((line, index, lines) => (
              <span
                key={line}
                className={lines.length > 1 ? styles.manualLine : undefined}
              >
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </h2>
        </header>

        {body ? <p className={styles.body}>{body}</p> : null}

        {paragraphs && paragraphs.length > 0 ? (
          <div className={styles.paragraphs}>
            {paragraphs.map((p) => (
              <p key={p} className={styles.body}>
                {p}
              </p>
            ))}
          </div>
        ) : null}

        {note ? <p className={styles.note}>{note}</p> : null}

        {pointsTitle || (points && points.length > 0) ? (
          <div className={styles.dataPanel}>
            {pointsTitle ? (
              <p className={styles.dataLabel}>{pointsTitle}</p>
            ) : null}
            {points && points.length > 0 ? (
              <ul className={styles.list}>
                {points.map((p) => (
                  <li key={p} className={styles.listItem}>
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {checks && checks.length > 0 ? (
          <div className={styles.dataPanel}>
            <ul className={styles.list}>
              {checks.map((c) => (
                <li key={c} className={styles.listItem}>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {table && table.length > 0 ? (
          <dl className={styles.dataTable}>
            {table.map((row) => (
              <div key={row.label} className={styles.tableRow}>
                <dt className={styles.tableLabel}>{row.label}</dt>
                <dd className={styles.tableValue}>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {orderedItems && orderedItems.length > 0 ? (
          <ol className={styles.orderedList}>
            {orderedItems.map((item, i) => (
              <li key={item} className={styles.orderedItem}>
                <span className={styles.orderedNum}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className={styles.orderedText}>{item}</p>
              </li>
            ))}
          </ol>
        ) : null}

        {detailItems && detailItems.length > 0 ? (
          <div className={styles.detailList}>
            {detailItems.map((d) => (
              <article key={d.title} className={styles.detailCard}>
                <h3 className={styles.detailTitle}>{d.title}</h3>
                {d.body ? <p className={styles.detailBody}>{d.body}</p> : null}
                {d.question ? (
                  <p className={styles.detailBody}>{d.question}</p>
                ) : null}
                {d.method ? (
                  <p className={styles.detailBody}>{d.method}</p>
                ) : null}
                {d.redFlag ? (
                  <p className={styles.detailRedFlag}>{d.redFlag}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {bullets && bullets.length > 0 ? (
          <div className={styles.dataPanel}>
            <ul className={styles.list}>
              {bullets.map((b) => (
                <li key={b} className={styles.listItem}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {negativeBullets && negativeBullets.length > 0 ? (
          <div className={styles.negativePanel}>
            <p className={styles.negativeLabel}>不适合:</p>
            <ul className={styles.negativeList}>
              {negativeBullets.map((n) => (
                <li key={n} className={styles.negativeItem}>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {quote ? (
          <figure className={styles.quoteCard}>
            <svg
              className={styles.quoteMark}
              viewBox="0 0 32 24"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 24V12C0 5.4 5.4 0 12 0V4C7.6 4 4 7.6 4 12H12V24H0ZM20 24V12C20 5.4 25.4 0 32 0V4C27.6 4 24 7.6 24 12H32V24H20Z"
                fill="currentColor"
              />
            </svg>
            <blockquote className={styles.quoteText}>{quote.text}</blockquote>
            {quote.attribution ? (
              <figcaption className={styles.quoteAttribution}>
                {quote.attribution}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {dataCard ? (
          <div className={styles.dataCard}>
            <span className={styles.dataCardLabel}>{dataCard.label}</span>
            <span className={styles.dataCardValue}>{dataCard.value}</span>
            {dataCard.note ? (
              <span className={styles.dataCardNote}>{dataCard.note}</span>
            ) : null}
          </div>
        ) : null}

        {summary ? <p className={styles.summary}>{summary}</p> : null}
      </RevealOnView>
    </section>
  );
}
