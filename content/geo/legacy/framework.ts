import type { LegacyResearchGeo } from '../../../lib/geo/types';

const data: LegacyResearchGeo = {
  slug: 'framework',
  title: '拿到一个美国房产项目，你应该问哪5个问题？',
  description:
    'SAREC 美国房产项目初判框架：从开发商记录、土地与许可、财务结构、市场可行性、退出机制 5 个维度，用公开信息做第一轮筛选。',
  directAnswer:
    '拿到一个美国房产项目，先问 5 个问题：开发商过往项目记录如何、土地与开发许可处于什么状态、财务结构是否合理、市场假设是否与可比数据匹配、退出机制是否清晰。这 5 个维度可以用公开信息完成第一轮筛选。它是初筛工具，不是最终决策依据；通过初筛的项目仍需专业律师和财务顾问做完整尽调。',
  faq: [
    {
      question: '核查开发商历史记录要看什么？',
      answer:
        '看开发商过去完成了多少类似项目、是否按时交付、是否超预算，以及有无未决诉讼或 SEC 调查记录。可以查美国法院公开记录（如 PACER）、USCIS 对 EB-5 区域中心的监管记录，以及关键人员的公开背景。开发商无法提供已完成项目列表是红旗信号。',
    },
    {
      question: '土地与许可状态为什么重要？',
      answer:
        '需要确认土地是否已完成产权清晰的收购、开发许可（Entitlement）处于哪个阶段、分区是否支持目标开发类型。如果土地仍在谈判、许可尚未启动，项目却已在推进资金安排，这是红旗信号。',
    },
    {
      question: '判断财务结构时最该关注什么？',
      answer:
        '关注资金来源构成（自有资金、银行贷款、EB-5 等）、GP 自有资金投入比例、优先回报分配给谁，以及收益假设是否现实。GP 几乎没有自有资金投入、风险主要由 LP 承担，是红旗信号；建议把协议交给与项目方无关的独立律师审阅分配结构。',
    },
    {
      question: '如何检验市场可行性和退出机制？',
      answer:
        '用 Zillow、Redfin、CoStar 和 LA County Assessor 等数据核对可比项目（Comps），看财务模型的售价或租金假设是否明显偏高。退出方面要明确时间线、退出方式（出售、再融资或持有出租）以及项目延期时 LP 的权利；合同没有延期处理条款是红旗信号。',
    },
    {
      question: '初判结果如何使用？',
      answer:
        '5 个维度全部通过，可进入深度尽调；通过 3–4 个，可有条件推进并重点关注未通过的维度；通过 2 个及以下，建议放弃。',
    },
  ],
  sourceList: [
    {
      name: 'PACER: Public Access to Court Electronic Records（美国联邦法院公开记录）',
      url: 'https://pacer.uscourts.gov/',
      accessedAt: '2026-11-05',
    },
    {
      name: 'USCIS: EB-5 Immigrant Investor Regional Centers',
      url: 'https://www.uscis.gov/working-in-the-united-states/permanent-workers/employment-based-immigration-fifth-preference-eb-5/eb-5-immigrant-investor-regional-centers',
      accessedAt: '2026-11-05',
    },
    {
      name: 'Los Angeles County Office of the Assessor',
      url: 'https://assessor.lacounty.gov/',
      accessedAt: '2026-11-05',
    },
  ],
  en: {
    title: 'What five questions should you ask about a U.S. real estate project?',
    directAnswer:
      'Start with five questions: What is the developer\'s track record? What is the status of the land and entitlements? Is the financial structure reasonable? Do the market assumptions match comparable data? Is the exit mechanism clear? These five dimensions support a first-pass screen using public information. The framework from SAREC (Sino-American Real Estate Chamber) is a screening tool, not a final decision; projects that pass still need full due diligence by an attorney and financial advisor.',
    faq: [
      {
        question: 'What should you check in a developer\'s track record?',
        answer:
          'How many similar projects the developer has completed, whether they were delivered on time and on budget, and whether there are pending lawsuits or SEC investigations. Sources include court records such as PACER, USCIS oversight records for EB-5 regional centers, and public background on key people. A developer who cannot list completed projects is a red flag.',
      },
      {
        question: 'Why do land and entitlement status matter?',
        answer:
          'Confirm that the land has been acquired with clear title, what stage the entitlements are at, and whether zoning supports the planned use. Raising money while the land is still under negotiation or before entitlements have started is a red flag.',
      },
      {
        question: 'What matters most in the financial structure?',
        answer:
          'The capital stack (equity, bank debt, EB-5, other), how much of its own capital the GP contributes, who receives preferred distributions, and whether the return assumptions are realistic. A GP with almost no capital at risk, leaving the risk on LPs, is a red flag. Have an attorney unconnected to the sponsor review the distribution terms.',
      },
      {
        question: 'How do you test market feasibility and the exit?',
        answer:
          'Check comparable sales and rents using sources such as Zillow, Redfin, CoStar, and the LA County Assessor, and see whether the model\'s price or rent assumptions are clearly above recent comps. For the exit, confirm the timeline, the method (sale, refinance, or hold for rent), and LP rights if the project is delayed; a contract with no delay provisions is a red flag.',
      },
      {
        question: 'How should the screening result be used?',
        answer:
          'If all five dimensions pass, move to in-depth due diligence; if three or four pass, proceed conditionally and focus on the dimensions that failed; if two or fewer pass, the framework suggests walking away.',
      },
    ],
  },
};

export default data;
