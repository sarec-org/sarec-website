import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RevealOnView } from '@/components/shared/RevealOnView';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ViewportLockScript } from '@/components/sections/research/ViewportLockScript';
import { CmsDetailHero } from '@/components/cms/CmsDetailHero';
import { CmsMarkdown } from '@/components/cms/CmsMarkdown';
import { NewsDisclaimer } from '@/components/cms/Disclaimers';
import { GALLERY_IMAGE, PROSE_CLASSES } from '@/components/cms/detailPresets';
import { getNewsBySlug, listNews } from '@/lib/cms/content';
import { buildNewsArticleJsonLd } from '@/lib/cms/schema';
import { buildBreadcrumbJsonLd } from '@/lib/geo/schema';
import { NEWS_CATEGORY_LABEL } from '@/lib/cms/labels';
import d from '@/components/cms/detail.module.css';

/**
 * 新闻详情 —— /zh/news/<slug>。
 * ------------------------------------------------------------------
 * 版式逐段照抄站内既有详情页 /zh/case-studies/4136-rosewood:
 *   R01 Cinematic Hero → R02 概览数据表 → R03 Editorial 正文 → R05 图集卡 → 免责 → R06 CTA。
 * 所有 news 详情页强制渲染同一段免责声明(单模板,内容编辑不可关闭)。
 * 活动回顾不走这条路由 —— 回顾属 events,渲染在对应活动页面上。
 */

type Params = { slug: string };

/** 无封面图时的兜底头图 —— 与 /zh/events 页 hero 同一张站内既有素材。 */
const FALLBACK_HERO = '/images/la/la-skyline-marquee.jpg';

export function generateStaticParams(): Params[] {
  return listNews().map((n) => ({ slug: n.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const news = getNewsBySlug(params.slug);
  if (!news) return {};
  return createPageMetadata({
    title: `${news.title}｜SAREC 新闻`,
    description: news.summary,
    path: `/zh/news/${news.slug}`,
    type: 'article'
  });
}

export default function NewsDetailPage({ params }: { params: Params }) {
  const news = getNewsBySlug(params.slug);
  if (!news) notFound();

  const pathname = `/zh/news/${news.slug}`;
  const articleJsonLd = buildNewsArticleJsonLd(news, { siteUrl: SITE_URL, pathname });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '首页', url: `${SITE_URL}/zh` },
    { name: '新闻与活动', url: `${SITE_URL}/zh/events` },
    { name: '新闻', url: `${SITE_URL}/zh/news` },
    { name: news.title, url: `${SITE_URL}${pathname}` }
  ]);

  return (
    <main>
      <ViewportLockScript />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* R01 同款 — Cinematic Hero */}
      <CmsDetailHero
        eyebrow={`NEWS · ${NEWS_CATEGORY_LABEL[news.category]}`}
        title={news.title}
        sublines={[news.summary]}
        image={{ src: news.coverImage ?? FALLBACK_HERO, alt: news.title }}
        primaryCta={{ label: '联系 SAREC', href: '/zh/contact' }}
        secondaryCta={{ label: '查看全部新闻', href: '/zh/news' }}
      />

      {/* R02 同款 — 概览数据表 */}
      <section className={d.overviewSection}>
        <div className={d.overviewInner}>
          <span className={d.eyebrow}>OVERVIEW · 基本信息</span>
          <RevealOnView as="h2" className={d.sectionH2}>
            基本信息
          </RevealOnView>
          <dl className={d.overviewTable}>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>分类</dt>
              <dd className={d.overviewValue}>{NEWS_CATEGORY_LABEL[news.category]}</dd>
            </div>
            <div className={d.overviewRow}>
              <dt className={d.overviewLabel}>发布日期</dt>
              <dd className={d.overviewValue}>{news.publishedAt.replace(/-/g, '.')}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* R03 同款 — Editorial 正文。背景按模板的 deepest / deep 交替节奏排布。 */}
      <section className={d.ed1Section}>
        <div className={d.ed1Inner}>
          <span className={d.eyebrow}>ARTICLE · 正文</span>
          <RevealOnView as="h2" className={d.sectionH2}>
            {news.title}
          </RevealOnView>
          <div className={d.ed1Block}>
            <CmsMarkdown md={news.body} classes={PROSE_CLASSES} />
          </div>
          {/* 新闻免责(单模板)—— 文案写死,所有 news 详情页强制渲染。
              放在正文段内,与页面其余段落左缘对齐。 */}
          <NewsDisclaimer />
        </div>
      </section>

      {/* R05 同款 — 图集卡片网格 */}
      {news.gallery.length > 0 ? (
        <section className={`${d.learnMoreSection} ${d.altBg}`}>
          <div className={d.learnMoreInner}>
            <span className={d.eyebrow}>GALLERY · 图集</span>
            <RevealOnView as="h2" className={d.sectionH2}>
              图集
            </RevealOnView>
            <div className={d.learnMoreGrid}>
              {news.gallery.map((g, i) => (
                <figure key={g.image} className={d.learnMoreCard}>
                  <span className={d.learnMoreNum}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className={d.typeImageBox}>{GALLERY_IMAGE(g)}</div>
                  <figcaption className={d.learnMoreBody}>{g.alt}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* R06 同款 — CTA Banner */}
      <section className={d.ctaSection}>
        <div className={d.ctaInner}>
          <RevealOnView as="h2" className={d.ctaH2}>
            想了解更多 SAREC 动态
          </RevealOnView>
          <p className={d.ctaSubtitle}>
            新闻、活动与研究,都在这里持续更新。
          </p>
          <div className={d.ctaRow}>
            <Link href="/zh/events" className={d.ctaPrimary}>
              新闻与活动
            </Link>
            <Link href="/zh/research" className={d.ctaSecondary}>
              研究中心
            </Link>
            <Link href="/zh/contact" className={d.ctaSecondary}>
              联系 SAREC
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
