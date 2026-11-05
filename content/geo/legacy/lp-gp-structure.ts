import type { LegacyResearchGeo } from "../../../lib/geo/types";

const data: LegacyResearchGeo = {
  slug: "lp-gp-structure",
  title: "LP / GP 合作结构详解",
  description:
    "从角色分工、资金路径、重大事项决策、信息披露、费用机制、利润分配顺序、超支处理和退出安排等角度，解释美国房地产项目 LP / GP 合作结构中投资人应重点关注的问题。",
  directAnswer:
    "在 LP / GP 合作安排中，LP 通常是主要出资、参与收益分配但不负责日常管理的有限合伙人，GP 是负责项目发起、执行、融资协调、建设、运营和退出的管理方。这种结构本身不是风险，风险在于权责、信息和利益是否匹配。投资人应重点看清：谁是真正的 GP、资金进入哪个主体并如何使用、重大事项由谁决策、信息如何披露、费用和利润分配顺序如何约定，以及超支和退出时怎么处理。",
  faq: [
    {
      question: "怎么判断谁是真正的 GP？",
      answer:
        "文件上可能出现 GP、Managing Member、Sponsor、Developer、Manager、Operator 等不同角色，不能只看名义。要问清楚谁负责拿地、审批和 permit、建筑贷款、选择总承包商、日常管理和财务报告，谁决定出售或再融资，以及谁在项目中承担经济风险。",
    },
    {
      question: "哪些重大事项通常需要明确的决策机制？",
      answer:
        "例如增加预算、追加投资人资金、变更融资结构、更换总承包商、出售或再融资、修改项目用途、重大诉讼或和解、延长项目周期以及关联方交易。需要判断这些事项是否需要 LP 同意、需要多数还是特别同意，以及投资人不同意时是否有保护机制。",
    },
    {
      question: "利润分配应该先看什么？",
      answer:
        "先看分配顺序，再看比例。需要关注 LP 是否先收回本金、是否有 preferred return 以及是否累积、GP 何时开始参与超额部分的分配、是否有 catch-up 机制、亏损如何承担，以及再融资和出售时如何清算。文中不讨论任何固定模式，具体安排须以项目文件、合同文本和专业意见为准。",
    },
    {
      question: "项目超支时合作结构要回答哪些问题？",
      answer:
        "谁有权决定追加资金、LP 是否必须追加、不追加是否会被稀释、GP 是否同步追加、能否引入新资金以及新资金是否优先于原投资人。稳健的结构应在出问题前就写清楚出问题时怎么办。",
    },
    {
      question: "跨境投资人参与 LP / GP 项目还要注意什么？",
      answer:
        "还要考虑英文合同理解、美国法律和税务制度差异、资金跨境路径、汇率、投资人身份和税务居民身份、是否涉及证券规则，以及是否涉及 EB-5 或移民安排。这些问题通常需要律师、会计师、税务顾问和移民律师共同参与。",
    },
  ],
  sourceList: [
    {
      name: "Investor.gov（SEC）— Regulation D Offerings",
      url: "https://www.investor.gov/introduction-investing/investing-basics/glossary/regulation-d-offerings",
      accessedAt: "2026-11-05",
    },
    {
      name: "SEC — Exempt Offerings",
      url: "https://www.sec.gov/resources-small-businesses/exempt-offerings",
      accessedAt: "2026-11-05",
    },
    {
      name: "Investor.gov（SEC）— Accredited Investors: Updated Investor Bulletin",
      url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated-3",
      accessedAt: "2026-11-05",
    },
    {
      name: "USCIS — EB-5 Immigrant Investor Program",
      url: "https://www.uscis.gov/working-in-the-united-states/permanent-workers/eb-5-immigrant-investor-program",
      accessedAt: "2026-11-05",
    },
  ],
  en: {
    title:
      "How does an LP / GP structure work in a U.S. real estate project, and what should investors check?",
    directAnswer:
      "In an LP / GP structure, the limited partners (LPs) mainly provide capital and share in distributions without running day-to-day operations, while the general partner (GP) originates and manages the project, coordinates financing, oversees construction and operations, and executes the exit. The structure itself is not the risk; the risk is whether authority, information and economic interests are aligned. Investors should be clear on who the real GP is, which entity receives the money and how it is used, who decides major matters, how information is reported, how fees and the distribution order are set, and what happens on cost overruns and exit.",
    faq: [
      {
        question: "How do you tell who the real GP is?",
        answer:
          "Documents may name a GP, managing member, sponsor, developer, manager or operator, so titles alone are not enough. Ask who sourced the land, handles approvals and permits, arranges the construction loan, selects the general contractor, runs the project and prepares financial reports, who decides on a sale or refinancing, and who bears economic risk.",
      },
      {
        question: "Which major decisions need a clear approval mechanism?",
        answer:
          "Examples include budget increases, capital calls, changes to the financing structure, replacing the general contractor, a sale or refinancing, changes in use or product, major litigation or settlements, extending the timeline, and related-party transactions. Check whether LP consent is required, whether a majority or supermajority applies, and what protection exists if investors disagree.",
      },
      {
        question: "What should investors look at first in profit distribution?",
        answer:
          "Look at the order of distributions before the percentages: whether LPs get their capital back first, whether there is a preferred return and whether it accrues, when the GP starts sharing in excess returns, whether there is a catch-up, how losses are borne, and how refinancing and sale proceeds are distributed. The article does not endorse any standard model; actual terms depend on the project documents and professional advice.",
      },
      {
        question: "What should the structure say about cost overruns?",
        answer:
          "Who can call additional capital, whether LPs must contribute, whether non-contributing investors are diluted, whether the GP must contribute alongside, whether new capital can come in, and whether new money ranks ahead of existing investors. A sound structure answers these questions before problems arise.",
      },
      {
        question: "What extra issues do cross-border investors face?",
        answer:
          "English-language contracts, differences in U.S. law and tax rules, cross-border fund flows, currency movements, investor and tax residency status, whether securities rules apply, and whether EB-5 or immigration arrangements are involved. These usually call for lawyers, accountants, tax advisers and immigration counsel working together.",
      },
    ],
  },
};

export default data;
