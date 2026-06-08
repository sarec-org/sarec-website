import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import {
  ServiceLandingLayout,
  type ServiceLandingContent
} from '@/components/templates/ServiceLandingLayout';

const PATH = '/zh/services/ai-visibility';

export const metadata: Metadata = createPageMetadata({
  title: 'AI Visibility｜SAREC',
  description:
    '评估品牌在 AI 搜索、AI 问答与 AI 推荐系统中的可见度、缺口与下一步 GEO 建设方向。',
  path: PATH
});

const content: ServiceLandingContent = {
  breadcrumb: [
    { label: { zh: '首页', en: 'Home' }, href: '/zh' },
    { label: { zh: '服务', en: 'Services' }, href: '/zh/services' },
    { label: { zh: 'AI 可见度', en: 'AI Visibility' }, href: PATH }
  ],
  hero: {
    eyebrow: { zh: 'AI Visibility', en: 'AI Visibility' },
    title: {
      zh: '看清你的品牌在 AI 回答里的位置',
      en: 'See where your brand stands in AI answers'
    },
    lead: {
      zh: 'AI Visibility 诊断帮助你了解品牌是否出现在 AI 搜索、AI 问答和 AI 推荐结果中,以及竞争对手正在占据哪些答案空间。',
      en: 'An AI Visibility review shows whether your brand appears in AI search, AI Q&A, and AI recommendations — and which answer space competitors are occupying.'
    },
    primaryCtaId: 'ai-search-audit'
  },
  sections: [
    {
      eyebrow: { zh: 'WHO THIS IS FOR · 适合谁', en: 'WHO THIS IS FOR' },
      heading: { zh: '适合谁', en: 'Who this is for' },
      body: {
        zh: '适合想知道自己是否被 AI 看见的企业、机构与服务品牌。',
        en: 'For companies, institutions, and service brands that want to know whether AI sees them.'
      }
    },
    {
      eyebrow: { zh: 'THE PROBLEM · 问题', en: 'THE PROBLEM' },
      heading: { zh: '在 Google 有排名,在 AI 里却不存在', en: 'Ranked on Google, absent in AI' },
      body: {
        zh: '很多品牌在 Google 上有排名,但在 AI 回答里完全不存在。两套系统的可见度逻辑并不相同。',
        en: 'Many brands rank on Google yet are entirely absent from AI answers. The two systems do not share the same visibility logic.'
      }
    },
    {
      eyebrow: { zh: 'WHAT SAREC REVIEWS · 诊断范围', en: 'WHAT SAREC REVIEWS' },
      heading: { zh: 'SAREC 评估什么', en: 'What SAREC reviews' },
      points: [
        { label: { zh: '品牌名', en: 'Brand name' } },
        { label: { zh: '核心业务词', en: 'Core business terms' } },
        { label: { zh: '高意向问题', en: 'High-intent questions' } },
        { label: { zh: '竞争对手', en: 'Competitors' } },
        { label: { zh: '内容缺口', en: 'Content gaps' } },
        { label: { zh: 'source 信号', en: 'Source signals' } }
      ]
    },
    {
      eyebrow: { zh: 'DELIVERABLES · 交付', en: 'DELIVERABLES' },
      heading: { zh: '交付物', en: 'Deliverables' },
      points: [
        { label: { zh: 'AI Visibility snapshot', en: 'AI Visibility snapshot' } },
        { label: { zh: '问题清单', en: 'Question inventory' } },
        { label: { zh: '竞争答案观察', en: 'Competitive answer observations' } },
        { label: { zh: 'GEO 建设建议', en: 'GEO build-out recommendations' } }
      ]
    },
    {
      eyebrow: { zh: 'PROCESS · 工作方式', en: 'PROCESS' },
      heading: { zh: '工作方式', en: 'How we work' },
      body: {
        zh: '确定问题集 → 测试主要 AI 平台 → 输出诊断 → 制定下一步内容方案。',
        en: 'Define the question set → test the major AI platforms → produce the diagnostic → plan the next content steps.'
      }
    },
    {
      eyebrow: { zh: 'BOUNDARY · 边界', en: 'BOUNDARY' },
      heading: { zh: '诊断的边界', en: 'Boundary of the review' },
      body: {
        zh: '诊断不是广告投放,不承诺排名,不承诺引用,不承诺流量。它提供的是对现状的清晰判断与下一步内容方向。',
        en: 'The review is not advertising. It makes no promise of rankings, citations, or traffic. It provides a clear read of the current state and a content direction for next steps.'
      }
    },
    {
      eyebrow: { zh: 'NEXT STEP · 下一步', en: 'NEXT STEP' },
      heading: { zh: '下一步', en: 'Next step' },
      body: {
        zh: '预约 AI Visibility 初步诊断,先看清现状,再谈建设。',
        en: 'Book a first AI Visibility review — understand the current state before discussing any build-out.'
      }
    }
  ],
  bottomCtaId: 'ai-search-audit'
};

export default function AiVisibilityServicePage() {
  return <ServiceLandingLayout content={content} />;
}
