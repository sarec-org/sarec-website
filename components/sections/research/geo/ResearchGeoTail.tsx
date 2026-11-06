/**
 * 旧版手写研究页的 GEO 尾部（GEO · J）。
 * ------------------------------------------------------------------
 * 一处补齐：常见问题（与 FAQPage JSON-LD 同源）/ 公开来源 / English summary / 非投资建议声明，
 * 并输出 Article + FAQPage + BreadcrumbList JSON-LD。
 * 数据由页面层经 accessor（getLegacyResearch）取得后以 props 传入；本组件不 import 访问层。
 */
import type { ReactElement } from 'react';
import type { LegacyResearchGeo } from '@/lib/geo/types';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import {
  buildBreadcrumbJsonLd,
  buildFAQPageJsonLd,
  buildResearchPageJsonLd
} from '@/lib/geo/schema';
import {
  englishByline,
  FOUNDER_AUTHOR,
  RESEARCH_DISCLAIMER,
  RESEARCH_DISCLAIMER_EN
} from '@/lib/geo/author';
import { Disclaimer, FaqSection, SourcesSection } from './ArticleEndSections';
import { EnglishSummary } from './GeoAnswerSections';

function JsonLdScript({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function ResearchGeoTail({ geo }: { geo: LegacyResearchGeo | null }): ReactElement | null {
  if (!geo) return null;
  const pathname = `/zh/research/${geo.slug}`;

  const articleJsonLd = buildResearchPageJsonLd({
    siteUrl: SITE_URL,
    pathname,
    headline: geo.title,
    description: geo.description,
    abstract: geo.directAnswer,
    author: FOUNDER_AUTHOR,
    publisherName: SITE_NAME,
    citations: geo.sourceList
  });
  const faqJsonLd = buildFAQPageJsonLd(geo.faq, geo.en.faq);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '首页', url: `${SITE_URL}/zh` },
    { name: '研究中心', url: `${SITE_URL}/zh/research` },
    { name: geo.title, url: `${SITE_URL}${pathname}` }
  ]);

  return (
    <>
      <JsonLdScript data={articleJsonLd} />
      <JsonLdScript data={faqJsonLd} />
      <JsonLdScript data={breadcrumbJsonLd} />

      <FaqSection items={geo.faq} />
      <SourcesSection items={geo.sourceList} />
      <EnglishSummary data={geo.en} byline={englishByline(FOUNDER_AUTHOR)} disclaimer={RESEARCH_DISCLAIMER_EN} />
      <Disclaimer text={RESEARCH_DISCLAIMER} />
    </>
  );
}
