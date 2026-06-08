import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import {
  ServiceLandingLayout,
  type ServiceLandingContent
} from '@/components/templates/ServiceLandingLayout';

const PATH = '/zh/services/geo';

export const metadata: Metadata = createPageMetadata({
  title: 'GEO Services｜SAREC',
  description:
    'SAREC 为企业、机构与专业服务品牌提供 GEO 内容体系、AI 搜索可见度与结构化内容建设咨询。',
  path: PATH
});

// 双语内容内联(渲染只读 zh,en 阶段 1.5 启用);文案克制、B2B、不承诺排名/引用/流量。
const content: ServiceLandingContent = {
  breadcrumb: [
    { label: { zh: '首页', en: 'Home' }, href: '/zh' },
    { label: { zh: '服务', en: 'Services' }, href: '/zh/services' },
    { label: { zh: 'GEO 服务', en: 'GEO Services' }, href: PATH }
  ],
  hero: {
    eyebrow: { zh: 'GEO Services', en: 'GEO Services' },
    title: {
      zh: '让你的机构在 AI 搜索与问答中被看见',
      en: 'Make your organization visible in AI search and answers'
    },
    lead: {
      zh: 'SAREC 帮助企业、机构与专业服务品牌建设面向 ChatGPT、Perplexity、Google AI Overview、DeepSeek、Kimi、豆包等 AI 回答系统的内容与权威信号。',
      en: 'SAREC helps companies, institutions, and professional-service brands build the content and authority signals that AI answer systems — ChatGPT, Perplexity, Google AI Overview, DeepSeek, Kimi, Doubao — draw on.'
    },
    primaryCtaId: 'ai-search-audit'
  },
  sections: [
    {
      eyebrow: { zh: 'WHO THIS IS FOR · 适合谁', en: 'WHO THIS IS FOR' },
      heading: { zh: '适合谁', en: 'Who this is for' },
      body: {
        zh: '适合企业、商会、专业服务机构、房地产相关机构与跨境服务品牌——希望在 AI 回答系统中建立稳定、可信存在的组织。',
        en: 'For companies, chambers, professional-service firms, real-estate-related institutions, and cross-border brands that want a stable, credible presence inside AI answer systems.'
      }
    },
    {
      eyebrow: { zh: 'THE PROBLEM · 问题', en: 'THE PROBLEM' },
      heading: { zh: '只做传统 SEO 已经不够', en: 'Traditional SEO alone is no longer enough' },
      body: {
        zh: '越来越多的客户在做决定前会先问 AI,而不是先搜 Google。只优化网页排名,无法决定你是否出现在 AI 的回答里。',
        en: 'More and more clients ask an AI before they search Google. Optimizing page rankings alone does not determine whether you appear in the AI’s answer.'
      }
    },
    {
      eyebrow: { zh: 'WHAT SAREC DOES · 我们做什么', en: 'WHAT SAREC DOES' },
      heading: { zh: 'SAREC 做什么', en: 'What SAREC does' },
      body: {
        zh: '围绕 AI 回答系统重建你的内容底座,让权威信息以结构化、可被引用的方式存在。',
        en: 'We rebuild your content foundation around AI answer systems, so authoritative information exists in a structured, citable form.'
      },
      points: [
        { label: { zh: 'GEO 内容体系', en: 'GEO content system' } },
        { label: { zh: '结构化内容', en: 'Structured content' } },
        { label: { zh: '权威问答单元', en: 'Authoritative Q&A units' } },
        { label: { zh: 'Research 内容库', en: 'Research content library' } },
        { label: { zh: '案例与 source 体系', en: 'Case and source system' } }
      ]
    },
    {
      eyebrow: { zh: 'DELIVERABLES · 交付', en: 'DELIVERABLES' },
      heading: { zh: '交付物', en: 'Deliverables' },
      points: [
        { label: { zh: 'GEO 诊断', en: 'GEO diagnostic' } },
        { label: { zh: 'AI 搜索可见度初评', en: 'AI search visibility baseline' } },
        { label: { zh: '内容结构建议', en: 'Content structure recommendations' } },
        { label: { zh: '主题集群建议', en: 'Topic cluster recommendations' } },
        { label: { zh: '可被 AI 引用的内容单元设计', en: 'Design of AI-citable content units' } }
      ]
    },
    {
      eyebrow: { zh: 'PROCESS · 工作方式', en: 'PROCESS' },
      heading: { zh: '工作方式', en: 'How we work' },
      body: {
        zh: '诊断 → 内容与结构方案 → 执行与复盘。',
        en: 'Diagnose → content and structure plan → execution and review.'
      }
    },
    {
      eyebrow: { zh: 'WHY SAREC · 为什么是 SAREC', en: 'WHY SAREC' },
      heading: { zh: '为什么是 SAREC', en: 'Why SAREC' },
      body: {
        zh: 'SAREC 自身正在用中美房地产研究内容搭建 GEO 样板——我们先用同一套方法服务自己,再把它带给客户。',
        en: 'SAREC is building its own GEO blueprint with U.S.–China real-estate research — we apply the same method to ourselves first, then bring it to clients.'
      }
    },
    {
      eyebrow: { zh: 'BOUNDARY · 边界', en: 'BOUNDARY' },
      heading: { zh: 'GEO 的边界', en: 'Boundary' },
      body: {
        zh: 'GEO 是内容与权威信号的建设工作,提升的是你被 AI 系统发现和引用的可能性,而不是保证。SAREC 不承诺排名、不承诺被 AI 引用、不承诺流量结果。',
        en: 'GEO is content and authority-signal work. It improves the likelihood that AI systems discover and cite you — it is not a guarantee. SAREC does not promise rankings, citations, or traffic outcomes.'
      }
    },
    {
      eyebrow: { zh: 'NEXT STEP · 下一步', en: 'NEXT STEP' },
      heading: { zh: '下一步', en: 'Next step' },
      body: {
        zh: '预约一次 AI 搜索可见度初步沟通,我们一起看你的内容在 AI 回答中的位置与缺口。',
        en: 'Book a first conversation on AI search visibility — together we’ll look at where your content stands in AI answers and where the gaps are.'
      }
    }
  ],
  bottomCtaId: 'ai-search-audit'
};

export default function GeoServicePage() {
  return <ServiceLandingLayout content={content} />;
}
