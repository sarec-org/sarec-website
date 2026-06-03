import type { Metadata } from 'next';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ServiceLandingLayout, type ServiceLandingContent } from '@/components/templates/ServiceLandingLayout';

const PATH = '/zh/services/professional-firms';

const baseMeta = createPageMetadata({
  title: 'AI 搜索与官网内容底座 · 专业服务机构｜SAREC',
  description:
    '面向律所、会计、投行与工程顾问等专业服务机构的一项可选服务:从 SEO 与 GEO 两个维度,检查官网内容结构与跨文化表达,评估其在客户理解、信任建设与 AI 搜索可见度方面的基础。',
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
    //   'en': `${SITE_URL}/en/services/professional-firms`
    // }
  }
};

// 入口 3 = 副线服务,整体降权:内容更短(2 sections)、语气更克制;
// CTA(hero + 底部)= ai-search-audit(tone neutral/muted,底部 CtaBlock 自动降权)。
// 双语内联,渲染只读 zh,英文阶段 1.5 启用。
const content: ServiceLandingContent = {
  breadcrumb: [
    { label: { zh: '首页', en: 'Home' }, href: '/zh' },
    { label: { zh: '服务', en: 'Services' }, href: '/zh/services' },
    { label: { zh: 'AI 搜索可见度', en: 'AI Search Visibility' }, href: PATH }
  ],
  hero: {
    eyebrow: { zh: 'FOR PROFESSIONAL FIRMS · 专业服务机构', en: 'FOR PROFESSIONAL FIRMS' },
    title: {
      zh: 'AI 搜索与官网内容底座',
      en: 'AI Search & Website Content Foundation'
    },
    lead: {
      zh: '面向律所、会计、投行与工程顾问等专业服务机构的一项可选服务:从 SEO 与 GEO 两个维度,检查官网内容结构、关键信息与跨文化表达,评估其在客户理解、信任建设与 AI 搜索可见度方面的基础。',
      en: 'An optional service for law firms, CPA firms, investment banks, and engineering or planning consultants: review website content structure, key messaging, and cross-cultural clarity from both SEO and GEO perspectives, and assess the foundation for client understanding, trust-building, and AI search visibility.'
    },
    primaryCtaId: 'ai-search-audit'
  },
  sections: [
    {
      eyebrow: { zh: '我们看什么', en: 'WHAT WE REVIEW' },
      heading: { zh: '我们可以帮你看什么', en: 'What we can review' },
      body: {
        zh: '适用于已有官网、想知道差距在哪的机构。我们从内容与可见度两端做一次诊断,给出可执行的改进方向。',
        en: 'Suited to firms that already have a website and want to know where the gaps are. We run one audit across content and visibility, and point to actionable improvements.'
      },
      points: [
        { label: { zh: 'AI 搜索可见度审计', en: 'AI search visibility audit' }, desc: { zh: '从 SEO 与 GEO 两个维度审视可见度。', en: 'Reviewing visibility across SEO and GEO.' } },
        { label: { zh: '内容资产诊断', en: 'Content asset review' }, desc: { zh: '诊断网站内容与文章质量。', en: 'Assessing website content and article quality.' } },
        { label: { zh: '跨文化沟通建议', en: 'Cross-cultural communication advice' }, desc: { zh: '从华人市场角度给出沟通建议。', en: 'Communication suggestions from a Chinese-market perspective.' } }
      ]
    },
    {
      eyebrow: { zh: '适用于谁', en: 'WHO IT SUITS' },
      heading: { zh: '适用于哪些机构', en: 'Who it suits' },
      body: {
        zh: '这是 SAREC 的一项副线能力,适用于希望把官网升级为内容资产的专业服务机构。',
        en: 'This is a secondary capability at SAREC, suited to professional firms that want to upgrade their website into a content asset.'
      },
      points: [
        { label: { zh: '律所', en: 'Law firms' } },
        { label: { zh: '会计 / 税务事务所', en: 'CPA & tax firms' } },
        { label: { zh: '投行 / 财务顾问', en: 'Investment banks & financial advisory firms' } },
        { label: { zh: '工程 / 建筑 / 规划顾问', en: 'Engineering, construction & planning firms' } },
        { label: { zh: '中介机构与本地专业服务商', en: 'Agencies and local professional service providers' } }
      ]
    }
  ],
  bottomCtaId: 'ai-search-audit'
};

export default function ProfessionalFirmsServicePage() {
  return <ServiceLandingLayout content={content} />;
}
