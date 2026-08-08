import type { Metadata } from 'next';
import { HeroV3B } from '@/components/hero/HeroV3B';
import { H02CinematicQuote } from '@/components/sections/H02CinematicQuote';
import { H03WhySarec } from '@/components/sections/H03WhySarec';
import { H04ThreeLayers } from '@/components/sections/H04ThreeLayers';
import { H05TrustAnchors } from '@/components/sections/H05TrustAnchors';
import { H06ProjectsFeatured } from '@/components/sections/H06ProjectsFeatured';
import { H07FounderIntro } from '@/components/sections/H07FounderIntro';
import { H08ResearchPreview, type ResearchCard } from '@/components/sections/H08ResearchPreview';
import { H09FAQ } from '@/components/sections/H09FAQ';
import { H10CTABanner } from '@/components/sections/H10CTABanner';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { listArticles } from '@/lib/geo/content';
import { columnLabel } from '@/lib/geo/labels';

export const metadata: Metadata = {
  title: 'SAREC · 中美房地产商会 — 跨境地产资本与项目协作平台',
  description:
    'SAREC 围绕项目判断、结构设计、风险控制与资源协同，帮助中国资本、美国项目方和专业服务机构建立更高效的跨境合作路径。',
  alternates: {
    canonical: 'https://sinoamericanrec.org/zh'
  }
};

export default function HomePage() {
  // 首页「近期研究」读取内容层已发布文章(draft 天然排除),按 publishedAt 倒序取最新 3 篇。
  // 卡片标题/摘要/链接全部来自文章数据;不足 3 篇时组件安全降级,不渲染空卡或空链接。
  const researchCards: ResearchCard[] = listArticles({ status: 'published' })
    .slice()
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, 3)
    .map((a) => ({
      tag: columnLabel(a),
      title: a.title,
      description: a.description,
      href: `/zh/research/${a.slug}`
    }));

  return (
    <main>
      {/* H01 — Hero v3-B Final (with embedded nav) */}
      <HeroV3B />

      {/* H02–H10 — Placeholders for Phase 1 visual implementation.
          Each is a 100vh dark section with a section ID and copy stub.
          Will be replaced by full implementations in subsequent prompts. */}

      <H02CinematicQuote />
      <H03WhySarec />

      <H04ThreeLayers />

      <H05TrustAnchors />

      <H06ProjectsFeatured />

      <H07FounderIntro />

      <H08ResearchPreview articles={researchCards} />

      <H09FAQ />

      <H10CTABanner />

      <SiteFooter />
    </main>
  );
}
