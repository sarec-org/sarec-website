import type { Metadata } from 'next';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ServiceLandingLayout, type ServiceLandingContent } from '@/components/templates/ServiceLandingLayout';

const PATH = '/zh/services/investors';

const baseMeta = createPageMetadata({
  title: '项目风险初诊与可行性评估 · 投资人 / 开发者｜SAREC',
  description:
    '面向中国资本、华人投资人与赴美开发者:在投入大额资金前,用一次独立的项目风险初诊,看清风险在哪、能不能碰、下一步怎么走。',
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
    //   'en': `${SITE_URL}/en/services/investors`
    // }
  }
};

// 双语内容内联在页面(不碰 lib/content 数据层);渲染只读 zh,英文阶段 1.5 启用
const content: ServiceLandingContent = {
  breadcrumb: [
    { label: { zh: '首页', en: 'Home' }, href: '/zh' },
    { label: { zh: '服务', en: 'Services' }, href: '/zh/services' },
    { label: { zh: '项目风险初诊', en: 'Project Risk Review' }, href: PATH }
  ],
  hero: {
    eyebrow: { zh: 'FOR INVESTORS · 投资人 / 开发者', en: 'FOR INVESTORS & DEVELOPERS' },
    // Hero = 服务名称,底部 CTA = 行动召唤,两者不重复
    title: { zh: '项目风险初诊与可行性评估', en: 'Project Risk Review & Feasibility Assessment' },
    lead: {
      zh: '在投入大额资金前,先判断项目能不能碰、风险在哪里、下一步怎么走。',
      en: 'Before committing significant capital, judge whether a project is worth pursuing, where the risks are, and what to do next.'
    },
    primaryCtaId: 'risk-review'
  },
  sections: [
    {
      eyebrow: { zh: '为什么先做风险初诊', en: 'WHY START WITH A RISK REVIEW' },
      heading: { zh: '大额投入前,先获得一个独立判断', en: 'Start with an independent judgment before you commit' },
      body: {
        zh: '我们提供的是独立判断,不是乐观故事。风险初诊从项目的关键维度出发,给出「能做 / 谨慎 / 不要碰」的红绿灯判断与关键下一步——不点名个案,只就维度本身做独立评估。',
        en: 'SAREC provides independent judgment, not optimistic sales language. The risk review works from a project’s key dimensions and returns a traffic-light read — go / proceed with caution / do not touch — plus the critical next step.'
      },
      points: [
        { label: { zh: '土地与权属', en: 'Land & title' }, desc: { zh: '权属是否清晰、有无限制与负担。', en: 'Whether title is clean, and any restrictions or encumbrances.' } },
        { label: { zh: 'Zoning 与审批', en: 'Zoning & entitlement' }, desc: { zh: '用途、审批路径与周期的不确定性。', en: 'Use, approval path, and timeline uncertainty.' } },
        { label: { zh: '市场与租金', en: 'Market & rents' }, desc: { zh: '需求、可售/可租价格与去化判断。', en: 'Demand, achievable pricing, and absorption.' } },
        { label: { zh: '融资可行性', en: 'Financing feasibility' }, desc: { zh: '资金结构、贷款条件与还款来源是否成立。', en: 'Whether the capital structure, loan terms, and repayment hold up.' } },
        { label: { zh: '合作结构', en: 'Deal structure' }, desc: { zh: '各方权责、风险分配是否清楚。', en: 'Whether roles and risk allocation are clear.' } },
        { label: { zh: '退出路径', en: 'Exit path' }, desc: { zh: '退出方式与时点是否现实。', en: 'Whether the exit and its timing are realistic.' } }
      ]
    },
    {
      eyebrow: { zh: '你会拿到什么', en: 'WHAT YOU GET' },
      heading: { zh: '一份能落地的书面判断', en: 'A written judgment you can act on' },
      body: {
        zh: '初诊在 1–2 周内交付,落到纸面,不止一通电话。',
        en: 'Delivered within 1–2 weeks, in writing — not just a phone call.'
      },
      points: [
        { label: { zh: '书面初诊报告', en: 'Written review report' }, desc: { zh: '5–15 页,覆盖上述关键维度。', en: '5–15 pages covering the key dimensions above.' } },
        { label: { zh: '一次深度讨论', en: 'A deep-dive discussion' }, desc: { zh: '60–90 分钟,把判断讲透。', en: '60–90 minutes to talk the judgment through.' } },
        { label: { zh: '红绿灯式判断', en: 'Traffic-light read' }, desc: { zh: '能做 / 谨慎 / 不要碰,立场清楚。', en: 'Go / caution / do not touch — a clear stance.' } },
        { label: { zh: '关键下一步', en: 'The critical next step' }, desc: { zh: '该补什么、该问谁、先做哪一步。', en: 'What to verify, whom to ask, what to do first.' } }
      ]
    },
    {
      eyebrow: { zh: '初诊之后', en: 'AFTER THE REVIEW' },
      heading: { zh: '从初诊到全程,按需要继续', en: 'From review to full engagement, as needed' },
      body: {
        zh: '初诊是第一道独立判断;如果项目值得推进,可继续做更深的评估与陪跑——按需要,不强推。',
        en: 'The review is a first independent judgment; if a project is worth pursuing, deeper assessment and hands-on support can follow — as needed, never pushed.'
      },
      points: [
        { label: { zh: '项目可行性评估', en: 'Feasibility assessment' }, desc: { zh: '在初诊基础上做更深的可行性论证。', en: 'A deeper feasibility case built on the review.' } },
        { label: { zh: '跨境架构设计', en: 'Cross-border structuring' }, desc: { zh: '配套的公司与持有结构设计。', en: 'Entity and holding structure design to match.' } },
        { label: { zh: '开发全程顾问', en: 'End-to-end development advisory' }, desc: { zh: '从认知到落地,陪客户走完全程。', en: 'Walking the client from understanding to execution.' } }
      ]
    },
    {
      eyebrow: { zh: '适合谁', en: 'WHO IT IS FOR' },
      heading: { zh: '这页是为这些人准备的', en: 'Who this page is for' },
      points: [
        { label: { zh: '中国资本 / 华人投资人', en: 'Chinese capital / overseas Chinese investors' } },
        { label: { zh: '想在美国做开发的新移民老板', en: 'New-immigrant owners developing in the U.S.' } },
        { label: { zh: '在大额投入前需要独立判断的人', en: 'Anyone needing an independent read before a major commitment' } }
      ]
    }
  ],
  bottomCtaId: 'risk-review'
};

export default function InvestorsServicePage() {
  return <ServiceLandingLayout content={content} />;
}
