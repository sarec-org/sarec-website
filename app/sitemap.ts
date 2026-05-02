import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const routes = [
  '/',
  '/zh',
  '/zh/about',
  '/zh/services',
  '/zh/services/strategy',
  '/zh/services/development',
  '/zh/services/due-diligence',
  '/zh/services/capital',
  '/zh/projects',
  '/zh/case-studies',
  '/zh/case-studies/4136-rosewood',
  '/zh/research',
  '/zh/research/eb5',
  '/zh/research/investment-pitfalls',
  '/zh/research/framework',
  '/zh/research/risk-checklist',
  '/zh/contact',
  '/zh/contact/thanks',
  '/zh/membership',
  '/zh/solutions',
  '/zh/activity',
  '/zh/events',
  '/zh/news',
  '/zh/legal/risk-disclosure',
  '/zh/legal/privacy',
  '/zh/legal/disclaimer'
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === '/zh/contact/thanks' ? 'yearly' : 'weekly',
    priority:
      route === '/' || route === '/zh'
        ? 1
        : route === '/zh/services' || route === '/zh/solutions' || route === '/zh/projects' || route === '/zh/contact'
          ? 0.9
          : 0.7
  }));
}
