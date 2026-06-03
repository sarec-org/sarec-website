import type { Metadata } from 'next';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ServiceLandingLayout, type ServiceLandingContent } from '@/components/templates/ServiceLandingLayout';

const PATH = '/zh/services/project-owners';

const baseMeta = createPageMetadata({
  title: '房地产项目华人市场增长服务 · 项目方｜SAREC',
  description:
    '帮美国房地产项目方建立面向华人市场的定位、内容资产、信任建设材料与 AI 搜索可见度 —— 提升项目在华人市场中的理解度、信任沟通基础与 AI 搜索可见度。',
  path: PATH
});

export const metadata: Metadata = {
  ...baseMeta,
  alternates: {
    // canonical 唯一裸域(与 SITE_URL 一致,www→301 已在服务器落地)
    canonical: `${SITE_URL}${PATH}`
    // 阶段 1.5 接 next-intl 时填(hreflang),零返工:
    // languages: {
    //   'zh-Hans': `${SITE_URL}${PATH}`,
    //   'en': `${SITE_URL}/en/services/project-owners`
    // }
  }
};

// 双语内容内联;文案严格对照《入口2 合规边界文档 V1.2》—— 只用允许词、全程正面表述。
// 渲染只读 zh,英文阶段 1.5 启用。
const content: ServiceLandingContent = {
  breadcrumb: [
    { label: { zh: '首页', en: 'Home' }, href: '/zh' },
    { label: { zh: '服务', en: 'Services' }, href: '/zh/services' },
    { label: { zh: '项目方增长', en: 'Project Growth' }, href: PATH }
  ],
  hero: {
    eyebrow: { zh: 'FOR PROJECT TEAMS · 项目方', en: 'FOR PROJECT TEAMS' },
    // Hero = 服务名称;底部 CTA(project-growth)= 行动召唤,两者不重复
    title: {
      zh: '房地产项目华人市场增长服务',
      en: 'Chinese-Market Growth Service for Real Estate Projects'
    },
    lead: {
      zh: '帮美国房地产项目方建立面向华人市场的定位、内容资产与信任沟通体系,帮助项目建立面向华人市场的清晰表达、信任沟通基础与 AI 搜索可见度。',
      en: 'Help U.S. real estate project teams build Chinese-market positioning, content assets, and trust-based communication, to improve clarity, trust-building, and AI search visibility in the Chinese-speaking market.'
    },
    primaryCtaId: 'project-growth'
  },
  sections: [
    {
      eyebrow: { zh: '我们做什么', en: 'WHAT WE DO' },
      heading: { zh: '我们为项目方做什么', en: 'What we do for project teams' },
      body: {
        zh: 'SAREC 把项目方在华人市场要讲的事,做成更容易被理解、被检索、并支持信任建立的内容产品。',
        en: 'SAREC turns what a project team needs to say to the Chinese-speaking market into content products that improve clarity, search visibility, and trust-building.'
      },
      points: [
        { label: { zh: '华人市场定位', en: 'Chinese-market positioning' }, desc: { zh: '厘清项目在华人市场的定位与差异化叙事。', en: 'Clarify the project’s positioning and differentiated narrative for the Chinese-speaking market.' } },
        { label: { zh: '内容资产', en: 'Content assets' }, desc: { zh: '产出可长期复用的项目说明材料与内容资产。', en: 'Produce reusable project explanation materials and content assets.' } },
        { label: { zh: '信任建设材料', en: 'Trust-building materials' }, desc: { zh: '把项目事实、合规与团队讲清楚,建立信任。', en: 'Explain the project’s facts, compliance, and team to build trust.' } },
        { label: { zh: 'AI 搜索可见度', en: 'AI search visibility' }, desc: { zh: '提升项目在 Google 与 AI 搜索中的可见度与信息解释准确性。', en: 'Improve search visibility and clarity in Google and AI search.' } }
      ]
    },
    {
      eyebrow: { zh: '你会拿到什么', en: 'WHAT YOU RECEIVE' },
      heading: { zh: '我们的交付物:材料与体系', en: 'What you receive: materials and systems' },
      body: {
        zh: '我们交付书面材料与结构化沟通体系 —— 把项目讲清楚、讲可信,而不替项目做任何交易性安排。',
        en: 'We deliver written materials and structured communication systems — explaining the project clearly and credibly, without making any transactional arrangements on its behalf.'
      },
      points: [
        { label: { zh: '项目说明材料', en: 'Project explanation materials' }, desc: { zh: '面向华人受众的双语项目说明与内容。', en: 'Bilingual project explanation and content for Chinese-speaking audiences.' } },
        { label: { zh: '华人市场教育材料', en: 'Chinese-market education materials' }, desc: { zh: '帮助受众理解项目所在赛道与判断逻辑的教育材料。', en: 'Education materials that help audiences understand the project’s sector and reasoning.' } },
        { label: { zh: '关系建设材料', en: 'Relationship-building materials' }, desc: { zh: '支持长期信任关系的内容与沟通材料。', en: 'Content and communication materials that support long-term trust.' } }
      ]
    },
    {
      eyebrow: { zh: '定位边界', en: 'OUR SCOPE' },
      heading: { zh: '我们的定位边界', en: 'Our scope' },
      body: {
        zh: 'SAREC 提供的是内容产品、教育材料与市场定位服务;项目的交易、资金与法律事务,由项目方及其持牌顾问负责。',
        en: 'SAREC provides content products, education materials, and market-positioning services; the project’s transactions, capital, and legal matters remain with the project team and its licensed advisors.'
      }
    },
    {
      eyebrow: { zh: '适合谁', en: 'WHO IT IS FOR' },
      heading: { zh: '适合哪些项目方', en: 'Who it is for' },
      points: [
        { label: { zh: '美国开发商 / 项目方', en: 'U.S. developers and project teams' } },
        { label: { zh: 'EB-5 项目方', en: 'EB-5 project teams' } },
        { label: { zh: '想进入华人市场的地产团队', en: 'Real estate teams entering the Chinese-speaking market' } }
      ]
    }
  ],
  bottomCtaId: 'project-growth'
};

export default function ProjectOwnersServicePage() {
  return <ServiceLandingLayout content={content} />;
}
