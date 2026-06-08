import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import {
  ServiceLandingLayout,
  type ServiceLandingContent
} from '@/components/templates/ServiceLandingLayout';

const PATH = '/zh/services/chatgpt-ads';

// 占位页:noindex + 不进 sitemap(robots 写法参考 contact/thanks/page.tsx)。
export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'ChatGPT Ads｜SAREC',
    description:
      'SAREC 关注 ChatGPT Ads、AI Ads 与对话式广告的趋势,预留未来 AI 搜索流量承接入口。',
    path: PATH
  }),
  robots: { index: false, follow: false }
};

const content: ServiceLandingContent = {
  breadcrumb: [
    { label: { zh: '首页', en: 'Home' }, href: '/zh' },
    { label: { zh: '服务', en: 'Services' }, href: '/zh/services' },
    { label: { zh: 'ChatGPT Ads', en: 'ChatGPT Ads' }, href: PATH }
  ],
  hero: {
    eyebrow: { zh: 'AI Ads Watch', en: 'AI Ads Watch' },
    title: {
      zh: '为未来的 ChatGPT Ads 与 AI Ads 流量做好准备',
      en: 'Getting ready for future ChatGPT Ads and AI Ads traffic'
    },
    lead: {
      zh: 'AI 搜索、AI 推荐和对话式广告正在形成新的获客入口。SAREC 现阶段仅做趋势观察与承接入口预留。',
      en: 'AI search, AI recommendations, and conversational advertising are forming a new acquisition channel. At this stage SAREC only watches the trend and reserves an entry point.'
    },
    primaryCtaId: 'contact-general'
  },
  sections: [
    {
      eyebrow: { zh: 'WHY THIS PAGE EXISTS · 为什么有这一页', en: 'WHY THIS PAGE EXISTS' },
      heading: { zh: '为什么有这一页', en: 'Why this page exists' },
      body: {
        zh: 'AI Ads 正在成为新的流量入口,企业需要提前理解未来的承接方式。',
        en: 'AI Ads are becoming a new traffic channel; companies need to understand how to receive that traffic in advance.'
      }
    },
    {
      eyebrow: { zh: 'CURRENT STATUS · 当前状态', en: 'CURRENT STATUS' },
      heading: { zh: '当前状态', en: 'Current status' },
      body: {
        zh: '现阶段仅观察趋势、保留入口、研究 AI 搜索流量的承接方式。',
        en: 'At this stage we only observe the trend, keep an entry point reserved, and study how to receive AI search traffic.'
      }
    },
    {
      eyebrow: { zh: 'WHAT SAREC CAN DISCUSS · 可以聊什么', en: 'WHAT SAREC CAN DISCUSS' },
      heading: { zh: 'SAREC 可以一起讨论的', en: 'What SAREC can discuss' },
      points: [
        { label: { zh: 'AI 搜索流量承接策略', en: 'Strategy for receiving AI search traffic' } },
        { label: { zh: 'GEO 内容基础设施', en: 'GEO content infrastructure' } },
        { label: { zh: '未来 AI Ads 测试准备', en: 'Preparation for future AI Ads testing' } }
      ]
    },
    {
      eyebrow: { zh: 'BOUNDARY · 边界', en: 'BOUNDARY' },
      heading: { zh: '边界', en: 'Boundary' },
      body: {
        zh: '这是一个趋势观察与入口预留页,不是已上线的投放服务。SAREC 现阶段不做投放执行,也不对广告结果作出任何承诺。',
        en: 'This is a trend-watch and reserved-entry page, not a live media service. At this stage SAREC does not run media buying and makes no promise about advertising outcomes.'
      }
    },
    {
      eyebrow: { zh: 'NEXT STEP · 下一步', en: 'NEXT STEP' },
      heading: { zh: '下一步', en: 'Next step' },
      body: {
        zh: '如果你希望为未来 AI 搜索和 AI Ads 流量做准备,可以提交问题,我们一起判断现在能做什么准备。',
        en: 'If you want to prepare for future AI search and AI Ads traffic, send us your situation and we’ll figure out what can be prepared now.'
      }
    }
  ],
  bottomCtaId: 'contact-general'
};

export default function ChatgptAdsServicePage() {
  return <ServiceLandingLayout content={content} />;
}
