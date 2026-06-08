import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import {
  ServiceLandingLayout,
  type ServiceLandingContent
} from '@/components/templates/ServiceLandingLayout';

const PATH = '/zh/services/consulting';

export const metadata: Metadata = createPageMetadata({
  title: 'Consulting｜SAREC',
  description:
    'SAREC 提供美国房地产项目风险初诊、跨境合规咨询、项目可行性研究、GEO 与 AI 工作流咨询。',
  path: PATH
});

const content: ServiceLandingContent = {
  breadcrumb: [
    { label: { zh: '首页', en: 'Home' }, href: '/zh' },
    { label: { zh: '服务', en: 'Services' }, href: '/zh/services' },
    { label: { zh: '咨询', en: 'Consulting' }, href: PATH }
  ],
  hero: {
    eyebrow: { zh: 'Consulting', en: 'Consulting' },
    title: {
      zh: '面向中美房地产与 AI 增长的高信任咨询',
      en: 'High-trust consulting for U.S.–China real estate and AI growth'
    },
    lead: {
      zh: 'SAREC 为计划进入美国市场的企业、投资人和专业服务机构提供项目风险初诊、合规路径梳理、内容增长与 AI 工作流咨询。',
      en: 'SAREC offers project risk reviews, compliance-path mapping, content growth, and AI workflow consulting for companies, investors, and professional firms planning to enter the U.S. market.'
    },
    primaryCtaId: 'risk-review'
  },
  sections: [
    {
      eyebrow: { zh: 'WHO THIS IS FOR · 适合谁', en: 'WHO THIS IS FOR' },
      heading: { zh: '适合谁', en: 'Who this is for' },
      body: {
        zh: '中国资本、华人开发商、跨境企业、房地产相关机构、高净值家庭与专业服务品牌。',
        en: 'Chinese capital, Chinese developers, cross-border companies, real-estate-related institutions, high-net-worth families, and professional-service brands.'
      }
    },
    {
      eyebrow: { zh: 'THE PROBLEM · 问题', en: 'THE PROBLEM' },
      heading: { zh: '中国经验不能直接照搬', en: 'Chinese experience does not transfer directly' },
      body: {
        zh: '美国市场的开发、合规、税务、移民、资金结构、AI 获客都不能直接照搬中国经验。',
        en: 'Development, compliance, tax, immigration, capital structure, and AI-driven acquisition in the U.S. cannot be copied directly from Chinese experience.'
      }
    },
    {
      eyebrow: { zh: 'WHAT SAREC PROVIDES · 服务范围', en: 'WHAT SAREC PROVIDES' },
      heading: { zh: 'SAREC 提供什么', en: 'What SAREC provides' },
      points: [
        { label: { zh: '风险初诊', en: 'Project risk review' } },
        { label: { zh: '项目可行性研究', en: 'Project feasibility study' } },
        { label: { zh: '跨境合规咨询', en: 'Cross-border compliance consulting' } },
        { label: { zh: '内容 / GEO 增长咨询', en: 'Content / GEO growth consulting' } },
        { label: { zh: 'AI 工作流咨询', en: 'AI workflow consulting' } }
      ]
    },
    {
      eyebrow: { zh: 'DELIVERABLES · 交付', en: 'DELIVERABLES' },
      heading: { zh: '交付物', en: 'Deliverables' },
      points: [
        { label: { zh: '初步问题诊断', en: 'Initial issue diagnosis' } },
        { label: { zh: '风险清单', en: 'Risk checklist' } },
        { label: { zh: '下一步专业顾问建议', en: 'Next-step professional-advisor recommendations' } },
        { label: { zh: '内容增长路径', en: 'Content growth path' } },
        { label: { zh: 'AI 工作流建议', en: 'AI workflow recommendations' } }
      ]
    },
    {
      eyebrow: { zh: 'PROCESS · 工作方式', en: 'PROCESS' },
      heading: { zh: '工作方式', en: 'How we work' },
      body: {
        zh: '提交问题 → 初步沟通 → 风险判断 → 下一步建议。',
        en: 'Submit your situation → first conversation → risk judgment → next-step recommendations.'
      }
    },
    {
      eyebrow: { zh: 'BOUNDARY · 边界', en: 'BOUNDARY' },
      heading: { zh: '咨询的边界', en: 'Boundary of consulting' },
      body: {
        zh: 'SAREC 不提供法律、税务、证券、移民最终意见;必要时应由持牌专业人士出具正式意见。',
        en: 'SAREC does not provide final legal, tax, securities, or immigration opinions; where required, formal opinions should come from licensed professionals.'
      }
    },
    {
      eyebrow: { zh: 'NEXT STEP · 下一步', en: 'NEXT STEP' },
      heading: { zh: '下一步', en: 'Next step' },
      body: {
        zh: '预约项目风险初步沟通,先把问题说清楚,再判断下一步。',
        en: 'Book a first project-risk conversation — get the questions clear, then decide the next step.'
      }
    }
  ],
  bottomCtaId: 'risk-review'
};

export default function ConsultingServicePage() {
  return <ServiceLandingLayout content={content} />;
}
