import type { LegacyResearchGeo } from "../../../lib/geo/types";

const data: LegacyResearchGeo = {
  slug: "risk-checklist",
  title: "美国房地产项目投资风险清单",
  description:
    "美国房地产项目初筛清单：从土地与权属、Zoning 与审批、市场与租金假设、建设成本与工期、融资与资金路径、LP / GP 合作结构、信息披露和退出八个维度逐项验证项目。",
  directAnswer:
    "判断一个美国房地产项目，不能只看位置、租金和收益测算，而应从土地与权属、Zoning 与审批、市场与租金假设、建设成本与工期、融资与资金路径、LP / GP 合作结构、信息披露和退出八个维度逐项验证。风险清单的作用不是否定项目，而是在早期把关键问题问清楚，避免到审批、融资、建设或退出阶段才发现重大不确定性。能够逐项回答这些问题的项目，才更值得进入下一步尽调和结构设计。",
  faq: [
    {
      question: "土地与审批阶段应该先核实什么？",
      answer:
        "先核实土地权属是否清楚，是否存在 lien、easement、encumbrance 等限制，以及是否涉及历史资源、环保或高火险区。审批方面要确认当前 zoning 是否支持项目用途、是否需要 entitlement 或 variance 等申请、Plan Check 是否完成，以及 RTI / Permit 状态是否真实。",
    },
    {
      question: "如何判断项目的市场和租金假设是否可靠？",
      answer:
        "看目标客群是否清楚、租金或售价是否来自真实可比项目、微区位是否支持目标产品，以及周边同类供给和空置率是否被充分考虑。还要问市场下行时项目是否仍有安全边际。",
    },
    {
      question: "建设成本和融资方面有哪些常见检查点？",
      answer:
        "建设方面看是否有完整的 hard cost 和 soft cost、GC 报价及 excluded items、contingency 是否充分、工期是否过于乐观。融资方面看股权资金是否到位、建筑贷款是否已有 term sheet 或明确沟通、利息储备是否充分、资金进入哪个主体，以及超支时由谁追加资金。",
    },
    {
      question: "LP / GP 合作结构和信息披露要问哪些问题？",
      answer:
        "要弄清谁是真正的 GP 或管理方、LP 有哪些信息权和监督权、重大事项是否需要投资人同意、各类费用和分成是否清楚、关联方交易是否披露。信息披露方面看是否有月度或季度报告、预算与实际支出对比、审批和施工进度及年度财务报告。",
    },
    {
      question: "项目初筛等于投资判断吗？",
      answer:
        "不等于。SAREC 的项目初筛是根据客户提供的资料，围绕土地、审批、融资、建设、租赁、退出和合作结构做初步梳理，帮助判断资料是否完整、风险是否清楚、下一步是否值得继续推进；具体事项仍需律师、会计师等专业人士参与判断。",
    },
  ],
  sourceList: [
    {
      name: "LADBS（洛杉矶市建筑与安全局）— Plan Review & Permitting",
      url: "https://dbs.lacity.gov/services/plan-review-permitting",
      accessedAt: "2026-11-05",
    },
  ],
  en: {
    title:
      "What should a risk checklist for a U.S. real estate investment project cover?",
    directAnswer:
      "A U.S. real estate project should be screened across eight dimensions, not just location, rents and projected returns: land and title, zoning and entitlements, market and rent assumptions, construction cost and schedule, financing and capital flow, the LP / GP structure, information disclosure, and exit. The purpose of a checklist is not to reject a project but to surface key questions early, before major uncertainties appear during approvals, financing, construction or exit. Only a project that can answer these questions one by one is ready for deeper due diligence and structuring.",
    faq: [
      {
        question: "What should be verified first on land and approvals?",
        answer:
          "Confirm clear title and whether there are liens, easements, encumbrances, historic, environmental or high fire hazard constraints. On approvals, confirm that current zoning supports the intended use, whether entitlements or variances are needed, whether Plan Check is complete, and whether the RTI / permit status is real.",
      },
      {
        question: "How do you test market and rent assumptions?",
        answer:
          "Check that the target tenant or buyer is clearly defined, that rents or sale prices come from real comparables, that the micro-location supports the product, and that competing supply and vacancy are fully considered. Also ask whether the project still has a margin of safety in a downturn.",
      },
      {
        question:
          "What are the main checks on construction cost and financing?",
        answer:
          "For construction: full hard and soft costs, a GC bid and its excluded items, adequate contingency, and a realistic schedule. For financing: whether equity is in place, whether a construction loan has a term sheet or clear lender discussions, whether the interest reserve is sufficient, which entity receives the funds, and who funds overruns.",
      },
      {
        question:
          "What should investors ask about the LP / GP structure and reporting?",
        answer:
          "Identify who the real GP or manager is, what information and oversight rights LPs have, whether major decisions require investor consent, whether all fees and splits are clear, and whether related-party transactions are disclosed. For reporting, look for monthly or quarterly updates, budget-versus-actual comparisons, approval and construction progress, and annual financial statements.",
      },
      {
        question: "Is a project screening the same as an investment decision?",
        answer:
          "No. SAREC (Sino-American Real Estate Chamber) reviews the materials a client provides across land, approvals, financing, construction, leasing, exit and deal structure to judge whether the information is complete, the risks are clear, and the next step is worth pursuing. Specific matters still require lawyers, accountants and other professionals.",
      },
    ],
  },
};

export default data;
