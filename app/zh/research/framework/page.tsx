import type { Metadata } from 'next';
import { ResearchArticlePage } from '@/components/sections/ResearchArticlePage';
import { researchPages } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

const page = researchPages.framework;

export const metadata: Metadata = createPageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: '/zh/research/framework'
});

export default function FrameworkPage() {
  return <ResearchArticlePage page={page} restoreScroll wide />;
}
