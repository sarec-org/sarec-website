import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPageMetadata, SITE_URL, SITE_NAME } from '@/lib/seo';
import { getArticle, listArticles, resolveSources } from '@/lib/geo/content';
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFAQPageJsonLd
} from '@/lib/geo/schema';
import { GeoArticleRenderer } from '@/components/sections/research/geo/GeoArticleRenderer';
import {
  RelatedReading,
  SourcesSection,
  FaqSection,
  Disclaimer,
  type RelatedArticleCard
} from '@/components/sections/research/geo/ArticleEndSections';
import type { SourceItem } from '@/lib/geo/types';

/**
 * GEO 旗舰文章动态路由 —— /zh/research/<slug>。
 * ------------------------------------------------------------------
 * 只服务 lib/geo accessor 里的 published GEO article;draft / 不存在 → notFound()。
 * 旧 9 篇 research 是字面静态目录,Next.js 静态段优先于本动态段,互不影响。
 * 仅经 accessor(getArticle/listArticles/resolveSources)取内容,不直接 import 内容文件。
 */

type Params = { slug: string };

// 仅预生成 published GEO article(draft stub 不在内,旧 9 篇走各自字面目录)。
export function generateStaticParams(): Params[] {
  return listArticles({ status: 'published' }).map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const article = getArticle(params.slug);
  if (!article || article.status !== 'published') {
    return {};
  }
  const meta = createPageMetadata({
    title: article.title,
    description: article.description,
    path: `/zh/research/${article.slug}`,
    type: 'article'
  });
  // 移除默认 OG 图,交由同目录 opengraph-image.tsx 自动生成品牌封面(M5);
  // twitter 同理走生成图。避免默认图与生成图冲突。
  if (meta.openGraph) delete (meta.openGraph as { images?: unknown }).images;
  if (meta.twitter) delete (meta.twitter as { images?: unknown }).images;
  return meta;
}

const DISCLAIMER =
  '本文为公开信息的研究与风险教育,不构成法律、税务、移民或证券建议;具体事项请咨询持牌专业人士。';

export default function GeoResearchArticlePage({ params }: { params: Params }) {
  const article = getArticle(params.slug);
  if (!article || article.status !== 'published') {
    notFound();
  }

  const pathname = `/zh/research/${article.slug}`;

  // Article JSON-LD —— citation 由 accessor 解析(只暴露已注册 source)。
  const articleJsonLd = buildArticleJsonLd(article, {
    siteUrl: SITE_URL,
    pathname,
    authorName: article.author.name,
    publisherName: SITE_NAME,
    sources: resolveSources(article.sources),
    extraCitations: (article.sourceList ?? []).map((s) => ({
      name: s.name,
      ...(s.url ? { url: s.url } : {})
    }))
  });

  // BreadcrumbList JSON-LD —— 首页 / 研究中心 / 当前文章。
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '首页', url: `${SITE_URL}/zh` },
    { name: '研究中心', url: `${SITE_URL}/zh/research` },
    { name: article.title, url: `${SITE_URL}${pathname}` }
  ]);

  // FAQPage JSON-LD —— article.faq 为空时,从 qaUnit blocks 拼最小可用问答
  // (qaUnit 无 answer 字段;把 judgment + boundary + riskNote 合成 acceptedAnswer.text)。
  const faqItems =
    article.faq && article.faq.length > 0
      ? article.faq
      : article.blocks
          .filter((b): b is Extract<typeof b, { type: 'qaUnit' }> => b.type === 'qaUnit')
          .map((b) => {
            const parts = [b.data.judgment];
            if (b.data.boundary) parts.push(`边界:${b.data.boundary}`);
            if (b.data.riskNote) parts.push(`风险提示:${b.data.riskNote}`);
            return { question: b.data.question, answer: parts.join(' ') };
          });
  const faqJsonLd = buildFAQPageJsonLd(faqItems);

  // 相关阅读（M3.3）—— 只收录已发布的相关文章，缺失 / 草稿静默跳过。
  const relatedItems: RelatedArticleCard[] = (article.relatedSlugs ?? [])
    .map((slug) => getArticle(slug))
    .filter((a): a is NonNullable<typeof a> => a !== null && a.status === 'published')
    .map((a) => ({ slug: a.slug, title: a.title, description: a.description }));

  // 数据来源（M3.4）—— 合并「已注册 Source（含 url/date）」与「自由文本 sourceList」，按名称去重。
  const registered: SourceItem[] = resolveSources(article.sources).map((s) => ({
    name: s.name,
    ...(s.url ? { url: s.url } : {}),
    ...(s.date ? { accessedAt: s.date } : {})
  }));
  const sourceItems: SourceItem[] = [...registered, ...(article.sourceList ?? [])].filter(
    (s, i, arr) => arr.findIndex((x) => x.name === s.name) === i
  );

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <GeoArticleRenderer article={article} />

      <FaqSection items={faqItems} />
      <SourcesSection items={sourceItems} />
      <RelatedReading items={relatedItems} />

      <Disclaimer text={DISCLAIMER} />
    </main>
  );
}
