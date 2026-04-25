import type { Metadata } from 'next';
import { ResearchArticlePage } from '@/components/sections/ResearchArticlePage';
import { researchPages } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

const page = researchPages.eb5;

export const metadata: Metadata = createPageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: '/zh/research/eb5'
});

export default function Eb5Page() {
  return <ResearchArticlePage page={page} />;
}
