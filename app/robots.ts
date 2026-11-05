import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * robots.txt（GEO · J）
 * ------------------------------------------------------------------
 * 三组规则：
 *  1. 默认组（*，含 Googlebot / Bingbot）：公开页面可抓取；私有路径一律禁止。
 *  2. AI 搜索 / 回答抓取（OAI-SearchBot、ChatGPT-User、Claude-SearchBot、Claude-User、
 *     PerplexityBot、Perplexity-User）：与默认组相同——公开页面可抓，私有路径禁止。
 *  3. AI 训练抓取（GPTBot、ClaudeBot、Google-Extended、CCBot、Applebot-Extended、
 *     Bytespider、meta-externalagent）：单独一组，由 ALLOW_TRAINING_ON_PUBLIC_CONTENT 控制。
 *       true  → 只允许公开文章 / 研究 / 新闻 / 活动 / 关于 / 服务，其余全部禁止；
 *       false → 整站禁止。
 * 会员档案、后台、付款 / 签到 / 登录、未公开材料等私有路径在每一组都禁止。
 */

// ⚙️ 训练抓取开关：改成 false 即整站拒绝训练抓取（搜索 / 回答抓取不受影响）。
const ALLOW_TRAINING_ON_PUBLIC_CONTENT: boolean = true;

// 私有 / 未公开路径 —— 每一组都禁止。
const PRIVATE_PATHS = [
  '/zh/staff',
  // '/zh/me' 用 $ 精确匹配 + '/zh/me/' 子路径，避免前缀误伤 /zh/members、/zh/membership。
  '/zh/me$',
  '/zh/me/',
  '/zh/pay',
  '/zh/checkin',
  '/zh/checkout',
  '/zh/signin',
  '/zh/confirm-email',
  '/zh/e/',
  '/zh/members/profiles/',
  '/zh/members/units/',
  '/zh/screen',
  '/api/',
  '/admin',
  '/keystatic',
  '/keystatic-import',
  '/zh/design-preview'
];

// 训练抓取允许的公开内容（仅在开关为 true 时生效）。
const TRAINING_ALLOWED_PATHS = [
  '/llms.txt',
  '/llms-full.txt',
  '/zh/research',
  '/zh/news',
  '/zh/events',
  '/zh/about',
  '/zh/services'
];

const SEARCH_AND_ANSWER_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User'
];

const TRAINING_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'CCBot',
  'Applebot-Extended',
  'Bytespider',
  'meta-externalagent'
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: SEARCH_AND_ANSWER_BOTS, allow: '/', disallow: PRIVATE_PATHS },
      ALLOW_TRAINING_ON_PUBLIC_CONTENT
        ? {
            userAgent: TRAINING_BOTS,
            allow: TRAINING_ALLOWED_PATHS,
            // 先禁止私有路径（更长前缀优先），再禁止其余一切。
            disallow: [...PRIVATE_PATHS, '/']
          }
        : { userAgent: TRAINING_BOTS, disallow: '/' }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
