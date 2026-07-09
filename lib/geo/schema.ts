/**
 * SAREC GEO B+ Core —— P1-2 Schema helper(纯函数层)。
 * ------------------------------------------------------------------
 * 仅生成 schema.org JSON-LD 的 plain object,供未来页面层注入。
 * - 无副作用:不读文件系统 / env,不依赖 window/document,不引入新 npm 包。
 * - 域名由 caller 经 options.siteUrl 注入;helper 内绝不硬编码生产域名,禁 blog 路径语义、禁旧域名。
 * - 所有返回值均为可 JSON.stringify 的 plain object。
 *
 * 纯函数层:运行时零数据依赖。只 `import type` lib/geo/types.ts 的类型;
 * 不依赖本地 content 访问层(citation 用的 Source[] 由 caller 解析后注入),
 * 以免序列化层与本地内容注册表绑死(将来切 CMS/DB 不受牵连)。
 */
import type { Article, Source, FAQItem } from './types';

type JsonLd = Record<string, unknown>;

/**
 * source.type → schema.org 引用类型的保守映射。
 * 拿不准的一律退回 "CreativeWork"。
 */
function citationType(type: Source['type']): string {
  switch (type) {
    case 'law':
      return 'Legislation';
    case 'market-report':
      return 'Report';
    case 'news':
      return 'NewsArticle';
    case 'government':
    case 'court':
    case 'project-experience':
    case 'expert-opinion':
    default:
      return 'CreativeWork';
  }
}

export function buildArticleJsonLd(
  article: Article,
  options: {
    siteUrl: string;
    pathname: string;
    authorName?: string;
    publisherName?: string;
    publisherLogoUrl?: string;
    sources?: Source[];
    // 自由文本来源（无 type），作 CreativeWork 追加进 citation（M3.4 可选接入）。
    extraCitations?: Array<{ name: string; url?: string }>;
  }
): Record<string, unknown> {
  const url = `${options.siteUrl}${options.pathname}`;

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': url,
    url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    headline: article.title,
    description: article.description,
    inLanguage: article.locale,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: {
      '@type': 'Person',
      name: options.authorName ?? article.author.name
    }
  };

  if (options.publisherName) {
    const publisher: JsonLd = {
      '@type': 'Organization',
      name: options.publisherName
    };
    if (options.publisherLogoUrl) {
      publisher.logo = {
        '@type': 'ImageObject',
        url: options.publisherLogoUrl
      };
    }
    jsonLd.publisher = publisher;
  }

  const citation = [
    ...(options.sources ?? [])
      .filter((s) => Boolean(s.name))
      .map((s) => ({
        '@type': citationType(s.type),
        name: s.name,
        ...(s.url ? { url: s.url } : {})
      })),
    ...(options.extraCitations ?? [])
      .filter((s) => Boolean(s.name))
      .map((s) => ({
        '@type': 'CreativeWork',
        name: s.name,
        ...(s.url ? { url: s.url } : {})
      }))
  ];

  if (citation.length > 0) {
    jsonLd.citation = citation;
  }

  return jsonLd;
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function buildFAQPageJsonLd(
  faqs: FAQItem[]
): Record<string, unknown> | null {
  if (!faqs || faqs.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}
