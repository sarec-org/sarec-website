import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import { FilterableStream, type FilterOption } from '@/components/cms/Filters';
import { listNews } from '@/lib/cms/content';
import { NEWS_CATEGORY_LABEL } from '@/lib/cms/labels';
import type { NewsCategory, NewsItem } from '@/lib/cms/types';
import styles from './news.module.css';
import { NewsHero } from './NewsHero';

/**
 * 新闻列表 —— /zh/news。
 * ------------------------------------------------------------------
 * 原「新闻与研究动态」导航卡页面已改造为真正的新闻时间流(倒序 + 分类可选筛选)。
 * 视觉规格全部照抄站内既有页面:Cinematic Hero 同 /zh/events,
 * 卡片同 events.module.css 的 E02 活动类型卡,不新造样式。
 * canonical 指向自身,已放开索引(原 robots noindex 已移除),并纳入 sitemap。
 */

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 新闻｜中美房地产商会',
  description:
    'SAREC 中美房地产商会的商会新闻、会员动态与合作进展。活动预告与活动回顾请见「新闻与活动」页面。',
  path: '/zh/news'
});

export default function NewsPage() {
  const news = listNews();

  const usedCategories = new Set(news.map((n: NewsItem) => n.category));
  const filters: FilterOption[] = (Object.keys(NEWS_CATEGORY_LABEL) as NewsCategory[])
    .filter((c) => usedCategories.has(c))
    .map((c) => ({ value: c as string, label: NEWS_CATEGORY_LABEL[c] }));

  const rows = news.map((n: NewsItem) => ({
    key: n.slug,
    filter: n.category as string,
    node: <NewsCard item={n} />
  }));

  return (
    <main>
      <ViewportLockScript />

      <NewsHero />

      <section className={styles.streamSection}>
        <div className={styles.streamInner}>
          <span className={styles.eyebrow}>ALL NEWS · 全部新闻</span>
          {news.length === 0 ? (
            <p className={styles.emptyNote}>
              新闻内容正在整理中。活动安排与往期回顾可查看{' '}
              <Link href="/zh/events" className={styles.inlineLink}>
                新闻与活动
              </Link>
              。
            </p>
          ) : (
            <FilterableStream
              options={filters}
              items={rows}
              classes={{
                row: styles.filterRow,
                btn: styles.filterBtn,
                btnActive: styles.filterBtnActive,
                stack: styles.typesGrid,
                empty: styles.emptyNote
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}

/* ── 卡片 —— 与 /zh/events 聚合页同一套规格(.typeCard / .typeNum / .typeH3 /
      .typeBody / .typeFoot / .inlineLink),不新造卡片样式。 ── */

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className={styles.typeCard}>
      <span className={styles.typeNum}>{item.publishedAt.replace(/-/g, '.')}</span>
      <h3 className={styles.typeH3}>{item.title}</h3>
      <p className={styles.typeBody}>{item.summary}</p>
      <p className={styles.typeFoot}>
        {NEWS_CATEGORY_LABEL[item.category]} ·{' '}
        <Link href={`/zh/news/${item.slug}`} className={styles.inlineLink}>
          阅读全文 →
        </Link>
      </p>
    </article>
  );
}
