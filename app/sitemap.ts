import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { listArticles } from '@/lib/geo/content';

// 静态路由(无可靠内容更新时间来源 → 不输出 lastModified;
// 禁止用 new Date()/构建时间/部署时间/请求时间冒充内容更新时间)。
// 注:
//  - 裸首页 '/' 现为 308 永久跳转到 '/zh',不进 sitemap(sitemap 只收真实 200 URL)。
//  - '/zh/contact/thanks' 为 noindex 页,不进 sitemap。
//  - '/zh/legal/privacy' 已 308 归并到站点级 '/legal/privacy',只收后者。
//  - services 子页收录范围本轮维持现状(不因路由存在而增删)。
const staticRoutes = [
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
  // GEO YAML/TS 文章(含旗舰文)不再硬编码,统一由下方 listArticles 动态收录,
  // 新发文自动进 sitemap,无需再手改本文件。
  '/zh/contact',
  '/zh/membership',
  '/zh/join',
  '/zh/strategic-partners',
  '/zh/events',
  '/zh/legal',
  '/zh/legal/risk-disclosure',
  '/legal/privacy',
  '/zh/legal/disclaimer'
];

function priorityFor(route: string): number {
  if (route === '/zh') return 1;
  if (route === '/zh/services' || route === '/zh/projects' || route === '/zh/contact') return 0.9;
  return 0.7;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: 'weekly',
    priority: priorityFor(route)
  }));

  // 草稿防泄漏第二道闸:仅 status='published' 的 GEO 文章进 sitemap;草稿天然排除。
  // 与硬编码列表去重(标准 research 页已在上方硬编码),避免重复条目。
  // lastModified 仅当内容源存在可靠 updatedAt/publishedAt 时才输出(禁止用构建/部署时间冒充)。
  const geoEntries: MetadataRoute.Sitemap = listArticles({ status: 'published' })
    .filter((a) => !staticRoutes.includes(`/zh/research/${a.slug}`))
    .map((a) => {
      const lastmod = a.updatedAt ?? a.publishedAt;
      return {
        url: `${SITE_URL}/zh/research/${a.slug}`,
        ...(lastmod ? { lastModified: new Date(lastmod) } : {}),
        changeFrequency: 'weekly' as const,
        priority: 0.7
      };
    });

  return [...staticEntries, ...geoEntries];
}
