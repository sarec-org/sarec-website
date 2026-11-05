import type { LegacyResearchGeo } from "../../../lib/geo/types";

const data: LegacyResearchGeo = {
  slug: "chinese-investors-us-real-estate-risks",
  title: "中国投资人美国房地产常见风险",
  description:
    "从信息不对称、经验迁移、审批、融资、微区位、建设、LP / GP 合作结构、退出路径和 EB-5 等角度，分析中国投资人参与美国房地产项目时的常见风险和判断框架。",
  directAnswer:
    "中国投资人参与美国房地产项目，常见风险主要有九类：信息不对称、中国开发经验的直接迁移、审批、融资、市场与微区位、建设成本与工期、合作结构、退出，以及涉及 EB-5 时的移民相关风险。真正的风险往往不在“有没有项目”，而在是否理解土地、审批、融资、建设、租赁、退出和合作结构背后的真实逻辑。更稳妥的做法是建立一套可以反复使用的项目判断框架，逐项追问后再决定是否推进。",
  faq: [
    {
      question: "为什么中国的开发经验不能直接用在美国？",
      answer:
        "中国房地产开发曾高度依赖速度、规模、销售和市场上行周期，而美国更强调分区、permit、entitlement、社区规则、合同机制、金融信用和长期持有逻辑。审批速度、建设周期、人工成本、贷款条件、去化、租赁需求和退出流动性都容易被误判。",
    },
    {
      question: "ED1 等支持政策是否意味着项目审批一定顺利？",
      answer:
        "不是。ED1 等政策可能提高部分 100% affordable housing 项目的审批效率，但具体项目仍要看是否真正符合政策条件、土地条件、图纸、部门协调和最新政策变化。投资人需要确认项目处于 entitlement、plan check、RTI 还是 permit 阶段。",
    },
    {
      question: "跨境投资人在美国申请建筑贷款会遇到什么问题？",
      answer:
        "贷款机构会看借款人信用、项目经验、担保能力、资产负债、预算、租金假设、利率环境和退出路径。新移民或新项目方常见的问题包括缺少美国本地信用记录和开发履历、银行不认可项目方经验，以及利率和贷款条件变化。融资路径应在投资前验证。",
    },
    {
      question: "靠近大学、医院或地铁的项目是否就安全？",
      answer:
        "不一定。决定出租和退出的是微区位、街区环境、交通方式、目标客群、竞争供给和价格敏感度。租金假设应来自真实可比项目，并充分考虑空置率；市场标签不能替代市场调研。",
    },
    {
      question: "涉及 EB-5 的项目要额外关注什么？",
      answer:
        "要同时看项目风险和资金路径、就业创造依据、区域中心或项目方背景、退出安排是否符合规则，以及移民流程的不确定性。EB-5 投资需满足相关移民规则和 at-risk 要求，任何项目都不应同时承诺投资安全和移民结果；具体问题应咨询专业移民律师，并以 USCIS 最新规定为准。",
    },
  ],
  sourceList: [
    {
      name: "Los Angeles City Planning — Executive Directive 1 (ED 1)",
      url: "https://planning.lacity.gov/project-review/executive-directive-1",
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
      "What are the common risks for Chinese investors in U.S. real estate?",
    directAnswer:
      "Chinese investors in U.S. real estate projects typically face nine kinds of risk: information asymmetry, applying China development experience without adjustment, approvals, financing, market and micro-location, construction cost and schedule, deal structure, exit, and, where EB-5 is involved, immigration-related risk. The real risk is usually not whether a project is available, but whether the investor understands the logic behind land, approvals, financing, construction, leasing, exit and the partnership structure. A safer approach is to build a reusable screening framework and work through each question before moving forward.",
    faq: [
      {
        question:
          "Why can’t China development experience be applied directly in the U.S.?",
        answer:
          "Development in China long relied on speed, scale, presales and a rising market, while the U.S. emphasizes zoning, permits, entitlements, community rules, contracts, credit and long-term holding. Approval timelines, construction periods, labor costs, loan terms, absorption, rental demand and exit liquidity are all easy to misjudge.",
      },
      {
        question:
          "Does a streamlining policy such as ED1 guarantee a smooth approval?",
        answer:
          "No. Policies such as Los Angeles’s ED1 may speed up approvals for some 100% affordable housing projects, but each project still depends on actual eligibility, site conditions, plans, interdepartmental coordination and the latest policy changes. Investors should confirm whether a project is at the entitlement, plan check, RTI or permit stage.",
      },
      {
        question:
          "What obstacles do cross-border investors face with construction loans?",
        answer:
          "Lenders look at the borrower’s credit, track record, guarantees, balance sheet, budget, rent assumptions, the interest-rate environment and the exit. New immigrants and first-time sponsors often lack U.S. credit history or a development track record, and loan terms and rates can change. The financing path should be verified before investing.",
      },
      {
        question:
          "Is a project near a university, hospital or transit automatically safe?",
        answer:
          "Not necessarily. Leasing and exit depend on the micro-location, block conditions, how tenants travel, the target tenant, competing supply and price sensitivity. Rent assumptions should come from real comparables and account for vacancy; a market label is not market research.",
      },
      {
        question: "What extra issues come with EB-5 projects?",
        answer:
          "Investors need to review project risk and fund flows, the basis for job creation, the regional center or sponsor’s background, whether the exit complies with program rules, and uncertainty in the immigration process. EB-5 investments must meet immigration rules including the at-risk requirement, no project should promise both investment safety and an immigration outcome, and specific questions should go to qualified immigration counsel, with current USCIS rules controlling.",
      },
    ],
  },
};

export default data;
