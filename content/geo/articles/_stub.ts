/**
 * GEO 文章 STUB —— P1-1 草稿占位(status: 'draft')。
 * ------------------------------------------------------------------
 * ⚠️ 本文件是 stub / draft,用于验证 blocks[] 数据模型与 accessor,**不是最终发布内容**。
 *    正文为占位说明文字,不含法律定性、不含收益承诺,发布前需由战略 / 律师重写并替换证据。
 *
 * 仅 lib/geo/content.ts(accessor 层)允许 import 本文件;页面层不得直接 import。
 */
import type { Article } from '../../../lib/geo/types';

export const stubArticle: Article = {
  slug: 'geo-b-core-article-stub',
  locale: 'zh',
  cluster: 'chinese-capital-us-re-risk',
  tier: 'pillar',
  status: 'draft',
  title: '中国资本投资美国房地产的十大陷阱',
  description:
    '面向中国投资人和开发商,梳理进入美国房地产开发与投资项目时最容易忽视的结构性风险。',
  audience: '中国投资人 / 出海开发商',
  intent: '理解进入美国房地产项目前的结构性风险与判断框架',
  author: {
    name: 'SAREC Research'
  },
  publishedAt: '2026-06-06',
  summary: [
    '【STUB / DRAFT 占位摘要,非最终内容】',
    '本文用于 P1-1 数据模型与 accessor 验证,正文与证据均为占位,发布前需重写。',
    '主题:中国资本进入美国房地产时容易忽视的结构性风险与判断要点。'
  ],
  blocks: [
    {
      type: 'callout',
      data: {
        tone: 'note',
        md: '本文为 P1-1 stub / draft 草稿,用于验证 blocks 数据模型,不是最终发布内容。'
      }
    },
    {
      type: 'prose',
      data: {
        md: '中国资本进入美国房地产开发与投资项目时,常常把注意力放在项目本身的回报预期上,却忽视了结构、流程与合规层面的差异。本段为占位说明文字。'
      }
    },
    {
      type: 'sectionHeading',
      data: {
        text: '为什么结构比项目更重要',
        id: 'why-structure'
      }
    },
    {
      type: 'keyPoints',
      data: {
        title: '进入项目前需要先看清的几件事(占位)',
        items: [
          '资金进入项目的法律结构与各方角色',
          '本地开发流程与审批节奏的差异',
          '退出路径与时间成本的预期管理'
        ]
      }
    },
    {
      type: 'qaUnit',
      data: {
        id: 'qa-structure-first',
        question: '进入一个美国房地产项目前,最先应该判断什么?',
        judgment:
          '先判断资金进入的结构与各方角色是否清晰,再判断项目本身是否值得继续看(占位判断,非建议)。',
        evidence: ['src-placeholder-public-records-001', 'src-placeholder-market-report-001'],
        boundary:
          '本判断仅为研究性梳理,不构成投资建议、法律意见、税务意见或移民建议。',
        riskNote: '占位风险提示:结构不清晰的项目,后续纠纷与退出难度通常更高。'
      }
    },
    {
      type: 'caseRef',
      data: {
        caseSlug: 'geo-b-core-case-stub'
      }
    },
    {
      type: 'cta',
      data: {
        intent: 'risk-review',
        label: '预约一次项目风险初步沟通',
        sourceSlug: 'geo-b-core-article-stub'
      }
    }
  ],
  faq: [
    {
      q: '这篇文章可以作为投资决策依据吗?',
      a: '不可以。本文为研究性内容,且当前为草稿占位,不构成任何投资、法律、税务或移民建议。'
    },
    {
      q: '文中提到的风险适用于所有项目吗?',
      a: '不一定。不同项目的结构、阶段与背景差异很大,需要逐个判断,不能一概而论。'
    }
  ],
  sources: ['src-placeholder-public-records-001', 'src-placeholder-market-report-001'],
  relatedSlugs: [],
  cta: {
    intent: 'risk-review',
    label: '预约一次项目风险初步沟通',
    sourceSlug: 'geo-b-core-article-stub'
  }
};
