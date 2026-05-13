import type { Metadata } from 'next';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { servicePages } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

const page = servicePages.dueDiligence;

export const metadata: Metadata = createPageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: '/zh/services/due-diligence'
});

export default function DueDiligencePage() {
  return <ServiceDetailPage page={page} />;
}
