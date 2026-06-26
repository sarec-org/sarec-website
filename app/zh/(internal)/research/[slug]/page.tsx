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
  return createPageMetadata({
    title: article.title,
    description: article.description,
    path: `/zh/research/${article.slug}`,
    type: 'article'
  });
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
    sources: resolveSources(article.sources)
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

  return (
    <main className="bg-[var(--ink-deepest)]">
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

      <section
        aria-label="免责声明"
        className="border-t border-[var(--line-2)] bg-[var(--ink-deepest)] pb-16 pt-8"
      >
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-8 xl:px-10">
          <p className="max-w-[900px] [font-family:var(--mono)] text-[0.8rem] leading-[1.7] text-[var(--ivory-mute)]">
            {DISCLAIMER}
          </p>
        </div>
      </section>
    </main>
  );
}
