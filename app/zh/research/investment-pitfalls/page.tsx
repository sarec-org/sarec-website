import type { Metadata } from 'next';
import { ResearchArticlePage } from '@/components/sections/ResearchArticlePage';
import { researchPages } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

const page = researchPages.investmentPitfalls;

export const metadata: Metadata = createPageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: '/zh/research/investment-pitfalls'
});

export default function InvestmentPitfallsPage() {
  return <ResearchArticlePage page={page} restoreScroll wide />;
}
