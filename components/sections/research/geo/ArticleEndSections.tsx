/**
 * 文章尾部区块（M3.3 相关阅读 / M3.4 数据来源）—— 前台化。
 * ------------------------------------------------------------------
 * - 由页面层解析好数据后以 props 传入（不在此 import 访问层，保持与渲染器同样的纯度边界）。
 * - 数据来源:name + 可选 URL + 可选抓取日期;URL 为外链新窗口打开。
 * - 相关阅读:标题 + 摘要 + 链接;仅收已发布文章(由 caller 过滤)。
 * - 任一列表为空则整块不渲染。
 */
import type { ReactElement } from 'react';
import Link from 'next/link';
import type { SourceItem } from '@/lib/geo/types';
import styles from './ArticleEndSections.module.css';

export type RelatedArticleCard = {
  slug: string;
  title: string;
  description: string;
};

export function RelatedReading(props: { items: RelatedArticleCard[] }): ReactElement | null {
  if (!props.items.length) return null;
  return (
    <section className={styles.block} aria-label="相关阅读">
      <h2 className={styles.blockTitle}>相关阅读</h2>
      <ul className={styles.relatedList}>
        {props.items.map((a) => (
          <li key={a.slug} className={styles.relatedItem}>
            <Link href={`/zh/research/${a.slug}`} className={styles.relatedLink}>
              <span className={styles.relatedTitle}>{a.title}</span>
              <span className={styles.relatedDesc}>{a.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SourcesSection(props: { items: SourceItem[] }): ReactElement | null {
  if (!props.items.length) return null;
  return (
    <section className={styles.block} aria-label="数据来源">
      <h2 className={styles.blockTitle}>数据来源</h2>
      <ol className={styles.sourceList}>
        {props.items.map((s, i) => (
          <li key={i} className={styles.sourceItem}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className={styles.sourceName}>
                {s.name}
              </a>
            ) : (
              <span className={styles.sourceName}>{s.name}</span>
            )}
            {s.accessedAt ? <span className={styles.sourceMeta}>抓取日期 {s.accessedAt}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
