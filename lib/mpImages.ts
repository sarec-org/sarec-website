/**
 * 小程序内容图片（/api/v1/content/...）
 * ------------------------------------------------------------------
 * - 图片与网站同源：public/images 下的项目照片、人物照片、主视觉，以及视频的封面图（视频先用封面代替）。
 * - 一律走网站的 Next 图片压缩（/_next/image?url=…&w=…&q=…）：按显示宽度出压缩后的尺寸，
 *   支持 WebP 的客户端自动给 WebP。小程序只需要一个图片域名：sinoamericanrec.org。
 * - 合规：含收益数字、投资回报的图表和数据图不给（按图片说明过滤：示意图 / 图表 / 数据 / 模型 / 测算，或含金额、百分比等）。
 */
import { SITE_URL } from '@/lib/seo';

export type MpImage = { src: string; alt: string };

/** 视频与部分封面图放在 R2（与网站 SaVideo 相同的映射：/videos/x → MEDIA_BASE/x） */
export const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE || 'https://pub-750866849946432cb842827f7414652c.r2.dev').replace(/\/$/, '');

/** 显示宽度档位：整屏宽 750（2 倍图约 375pt）；卡片缩略图 384 */
export type ImgWidth = 384 | 750 | 1080;

function sourceUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/videos/')) return `${MEDIA_BASE}/${path.replace(/^\/videos\//, '')}`;
  return path.startsWith('/') ? path : `/${path}`;
}

/** 网站图片 → 压缩后的地址（q=70） */
/** 正式站用 sinoamericanrec.org；预览部署用自己的网址（预览时就能看到图） */
const IMAGE_ORIGIN = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : SITE_URL;

export function img(path: string, alt: string, w: ImgWidth = 750): MpImage {
  return { src: `${IMAGE_ORIGIN}/_next/image?url=${encodeURIComponent(sourceUrl(path))}&w=${w}&q=70`, alt };
}

/** 图表、数据图、示意图不进小程序（按 alt / 标题判断） */
const CHART_RE = /(示意图|图表|图解|数据|统计|模型|测算|走势|对比图|流程图|chart|diagram|infographic|graph)/i;
/** 与内容过滤同一套：收益、回报、金额、百分比等 */
const MONEY_RE = /(IRR|ROE|ROI|回报|收益|年化|利润|分红|现金流|cap\s*rate|募资|\$\s?\d|\d[\d,.]*\s*(%|％|万美元|亿美元|美元|万元|亿元))/i;
/** 说明里有 3 个以上数字（如“申报 43,300、获批 34,000、许可 8,058”）也算数据图 */
const manyNumbers = (t: string) => (t.match(/\d[\d,.]*/g) ?? []).length >= 3;
export const imageAllowed = (...texts: (string | undefined | null)[]) =>
  !texts.some((t) => !!t && (CHART_RE.test(t) || MONEY_RE.test(t) || manyNumbers(t)));

/** 图片清单（与网站各页面用图一致） */
export const IMAGES = {
  logo: img('/brand/sarec-logo.png', 'SAREC 中美房地产商会', 384),
  homeHero: img('/images/home/los-angeles-hero.jpg', '洛杉矶城市天际线'),
  aboutHero: img('/images/home/los-angeles-hero.jpg', '洛杉矶城市天际线'),
  servicesHero: img('/images/artgrid/services-hero-la-city.jpg', '洛杉矶城市'),
  researchHero: img('/videos/research-hero-nyc-poster.jpg', '城市天际线'),
  benefitsHero: img('/images/la/la-skyline-marquee.jpg', '洛杉矶城市天际线'),
  featuredProject: img('/images/projects/4136-rosewood-rendering.png', '4136 Rosewood Ave 项目效果图'),
  founder: img('/images/founder/andy-wang-founder.jpg', 'Andy Wang · SAREC 创始人', 384),
  founderSpeaking: img('/images/founder/andy-wang-speaking.jpg', 'Andy Wang 在 SAREC 活动上分享')
};

/** 服务卡片图：与网站服务页各板块用图对应 */
const SERVICE_IMAGES: Record<string, [string, string]> = {
  strategy: ['/images/projects/1340-glendale-triangle.webp', '美国房地产开发项目'],
  development: ['/images/projects/4155-wilshire-bronson.webp', '洛杉矶开发项目'],
  'due-diligence': ['/videos/advisory-presentation-poster.jpg', '项目尽调与研讨'],
  capital: ['/images/projects/2215-wellesley-ed1.webp', '洛杉矶 ED1 项目']
};
export function serviceImage(slug: string, w: ImgWidth = 384): MpImage | null {
  const m = SERVICE_IMAGES[slug];
  return m ? img(m[0], m[1], w) : null;
}

/** 研究页封面（网站研究页的视频封面）。cap-rate-irr-roe 封面是图表照片，不给。 */
const RESEARCH_POSTERS: Record<string, string> = {
  eb5: '/images/research/eb5-poster.jpg',
  'investment-pitfalls': '/images/research/investment-pitfalls-poster.jpg',
  framework: '/images/research/framework-poster.jpg',
  'risk-checklist': '/images/research/risk-checklist-poster.jpg',
  'lp-gp-structure': '/images/research/lp-gp-structure-poster.jpg',
  'chinese-investors-us-real-estate-risks': '/images/research/chinese-investors-us-real-estate-risks-poster.jpg',
  'us-real-estate-development-process': '/images/research/us-real-estate-development-process-poster.jpg',
  'los-angeles-ed1-affordable-housing': '/images/research/research-ed1-poster.jpg'
};
export function researchPoster(slug: string, title: string, w: ImgWidth = 384): MpImage | null {
  const p = RESEARCH_POSTERS[slug];
  return p ? img(p, title, w) : null;
}
