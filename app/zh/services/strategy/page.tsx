import type { Metadata } from 'next';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { servicePages } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

const page = servicePages.strategy;

export const metadata: Metadata = createPageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: '/zh/services/strategy'
});

export default function StrategyPage() {
  return <ServiceDetailPage page={page} />;
}
