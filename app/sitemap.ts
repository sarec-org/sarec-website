import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

const routes = [
  '/',
  '/zh',
  '/zh/about',
  '/zh/about/founder',
  '/zh/services',
  '/zh/services/strategy',
  '/zh/services/development',
  '/zh/services/due-diligence',
  '/zh/services/capital',
  '/zh/services/geo',
  '/zh/services/ai-visibility',
  '/zh/services/consulting',
  '/zh/projects',
  '/zh/case-studies',
  '/zh/case-studies/4136-rosewood',
  '/zh/research',
  '/zh/research/cap-rate-irr-roe',
  '/zh/research/chinese-investors-us-real-estate-risks',
  '/zh/research/lp-gp-structure',
  '/zh/research/los-angeles-ed1-affordable-housing',
  '/zh/research/us-real-estate-development-process',
  '/zh/research/risk-checklist',
  '/zh/research/eb5',
  '/zh/research/framework',
  '/zh/research/investment-pitfalls',
  '/zh/contact',
  '/zh/contact/thanks',
  '/zh/membership',
  '/zh/events',
  '/zh/legal',
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
        : route === '/zh/services' || route === '/zh/projects' || route === '/zh/contact'
          ? 0.9
          : 0.7
  }));
}
