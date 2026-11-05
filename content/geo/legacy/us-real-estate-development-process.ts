import type { LegacyResearchGeo } from '../../../lib/geo/types';

const data: LegacyResearchGeo = {
  slug: 'us-real-estate-development-process',
  title: '美国房地产开发完整流程',
  description:
    '系统梳理美国房地产开发从土地筛选、可行性分析、entitlement、Plan Check、permit、融资、GC 招标、施工、运营到退出的完整流程，以及每个阶段的关键判断与风险。',
  directAnswer:
    '美国房地产开发通常经历十个阶段：土地筛选、可行性分析、entitlement、设计深化与 Plan Check、Permit 与 RTI、融资安排、GC 招标与施工合同、施工管理、运营准备和退出。它不是"买地、盖楼、卖掉"的线性动作，而是一个逐步把不确定性转化为确定性的过程，各环节相互影响。判断一个项目，关键是看清它处在哪个阶段、还缺哪些条件、哪些风险尚未解决、合作结构和退出路径是否清晰。',
  faq: [
    {
      question: '为什么说土地筛选决定了项目的大部分命运？',
      answer:
        '土地是开发的起点，也是很多风险的源头。需要判断的不只是土地价格，还有 zoning 和可开发强度、特殊规划区或环保限制、地块形状与临街条件、公用事业接入、周边竞品，以及土地价格是否已经透支开发利润。土地便宜不等于项目安全，关键是土地条件能否支撑开发逻辑。'
    },
    {
      question: 'Entitlement 和 Permit 有什么区别？',
      answer:
        'Entitlement 通常指项目获得土地使用、规划条件、开发强度或特定用途许可的过程，可能涉及 density bonus、variance、conditional use permit、社区听证或环境评估。Permit 则关乎能否真正开工，需要完成 Plan Check、回复 Corrections、缴费并取得各部门 clearance。Entitlement 已通过、RTI Ready 和 Permit 已领取是不同阶段，"接近开工"和"可以开工"不是同一件事。'
    },
    {
      question: '开发项目的融资需要关注什么？',
      answer:
        '开发项目通常需要股权资金、建筑贷款，以及过桥、优先或夹层等资金安排。要看清土地资金和前期软成本由谁承担、建筑贷款是否有 term sheet 或正式承诺、贷款比例、利率、费用和放款条件、是否需要 completion guarantee 或 personal guarantee、利息储备是否充分，以及成本超支如何处理。'
    },
    {
      question: '选择总承包商（GC）时只看最低报价可以吗？',
      answer:
        '不可以。低报价不一定是低成本，需要看报价是否基于完整图纸、是否存在 exclusions、合同是 fixed price、cost plus 还是 GMP、change order 如何审批、工期和延误责任、付款节点和保留金、保险和履约能力，以及是否存在关联方交易。'
    },
    {
      question: '退出路径应该什么时候考虑？',
      answer:
        '应从项目开始时就设计，而不是最后一步才考虑。常见路径包括出售、再融资和长期持有，都会受市场、利率、cap rate、租金、买家需求、贷款条件和税务安排影响；还需要提前明确谁决定退出时间、是否设最低出售条件，以及 LP / GP 如何参与退出决策。'
    }
  ],
  sourceList: [
    {
      name: 'Los Angeles City Planning（洛杉矶城市规划局：分区与 entitlement 审批）',
      url: 'https://planning.lacity.gov/',
      accessedAt: '2026-11-05'
    },
    {
      name: 'Los Angeles Department of Building and Safety (LADBS)（Plan Check 与建筑许可）',
      url: 'https://dbs.lacity.gov/',
      accessedAt: '2026-11-05'
    },
    {
      name: "California Governor's Office of Land Use and Climate Innovation：CEQA: The California Environmental Quality Act",
      url: 'https://lci.ca.gov/ceqa/',
      accessedAt: '2026-11-05'
    }
  ],
  en: {
    title: 'What are the stages of real estate development in the US?',
    directAnswer:
      'US real estate development typically moves through ten stages: site selection, feasibility analysis, entitlement, design development and plan check, permits and RTI (ready to issue), financing, GC bidding and construction contracts, construction management, lease-up or operations, and exit. It is not a linear "buy land, build, sell" exercise but a process of steadily turning uncertainty into certainty, with each stage affecting the others. Evaluating a project means understanding which stage it is in, what conditions are still missing, which risks remain open, and whether the partnership structure and exit path are clear.',
    faq: [
      {
        question: 'Why does site selection shape so much of a project’s outcome?',
        answer:
          'Land is where development starts and where many risks originate. Beyond price, investors need to look at zoning and allowable density, special plan areas or environmental limits, lot shape and frontage, utility access, competing supply, and whether the land price already consumes the development margin. Cheap land is not the same as a safe project; what matters is whether the site supports the development logic.'
      },
      {
        question: 'How is entitlement different from a permit?',
        answer:
          'Entitlement generally refers to securing land-use rights, planning approvals, density or specific-use permissions, which may involve density bonuses, variances, conditional use permits, public hearings or environmental review. A permit determines whether construction can actually start, after plan check, correction responses, fees and department clearances. "Entitled", "RTI ready" and "permit issued" are different stages—being close to construction is not the same as being able to start.'
      },
      {
        question: 'What should investors look for in development financing?',
        answer:
          'Development usually combines equity with a construction loan and sometimes bridge, preferred or mezzanine capital. Investors should confirm who funds the land and early soft costs, whether the construction loan has a term sheet or firm commitment, the loan-to-cost, rate, fees and draw conditions, whether completion or personal guarantees are required, whether the interest reserve is adequate, and how cost overruns are handled.'
      },
      {
        question: 'Is the lowest general contractor bid the best choice?',
        answer:
          'Not necessarily. A low bid is not always a low cost. Check whether it is based on complete drawings, what is excluded, whether the contract is fixed price, cost-plus or GMP, how change orders are approved, schedule and delay responsibility, payment milestones and retainage, insurance and capacity to perform, and whether any related-party dealings are involved.'
      },
      {
        question: 'When should the exit strategy be planned?',
        answer:
          'From the start of the project, not at the end. Common exits—sale, refinancing or long-term hold—all depend on market conditions, interest rates, cap rates, rents, buyer demand, lending terms and tax considerations. It also helps to agree early on who decides the timing of an exit, whether there is a minimum sale condition, and how LPs and GPs take part in exit decisions.'
      }
    ]
  }
};

export default data;
