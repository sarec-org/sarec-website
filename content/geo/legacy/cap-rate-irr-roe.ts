import type { LegacyResearchGeo } from '../../../lib/geo/types';

const data: LegacyResearchGeo = {
  slug: 'cap-rate-irr-roe',
  title: 'Cap Rate / IRR / ROE 如何理解',
  description:
    '解释美国房地产投资中常见的 Cap Rate、IRR、ROE、NOI、现金流与退出估值等指标，说明这些指标背后的假设、风险和判断方法。',
  directAnswer:
    'Cap Rate、IRR、ROE 都是在一组假设下算出来的结果，不是收益保证，也不能替代对项目本身的判断。Cap Rate 通常表达为 NOI ÷ 物业价值，更像一种市场估值语言；IRR 衡量现金流在时间维度上的效率，对工期和退出假设非常敏感；ROE 衡量股权回报，常被杠杆放大，同时放大风险。看这些指标时，应先回到收入、成本、融资、时间和退出假设逐项验证。',
  faq: [
    {
      question: 'Cap Rate 是什么？它是项目的回报率吗？',
      answer:
        'Cap Rate（资本化率）一般表达为 Cap Rate = NOI ÷ 物业价值，或物业价值 = NOI ÷ Cap Rate。它不是固定收益率，也不代表项目一定能拿到相应回报，而是市场对风险、增长和资产质量的一种定价语言，用来比较不同资产、区域和风险水平下的价格。'
    },
    {
      question: '为什么退出 Cap Rate 的假设这么重要？',
      answer:
        '开发或增值型项目的退出价值，往往根据未来 NOI 和退出 Cap Rate 计算。如果模型用较低的退出 Cap Rate，估值会被放大；如果利率上升、买家减少或区域风险提高，退出 Cap Rate 可能上升，估值随之下降。因此退出假设需要有可比交易依据，并做敏感性分析。'
    },
    {
      question: 'IRR 有什么局限？',
      answer:
        'IRR 反映资金投入和回收的时间效率，但只看 IRR 容易忽略项目总利润、本金安全边际、现金流波动、延期风险、退出假设和 LP / GP 分配结构。开发周期过短、成本预算过低、租金或售价过高、退出 Cap Rate 过低，都会让模型中的 IRR 被抬高。'
    },
    {
      question: 'ROE 高是不是说明项目好？',
      answer:
        '不一定。ROE 高可能来自项目本身质量，也可能来自高杠杆。高杠杆会增加利率风险和再融资风险、减少安全边际，市场下行时更容易承压，所以 ROE 必须结合杠杆结构和风险承担一起看。'
    },
    {
      question: '投资人看财务模型时应该先问什么？',
      answer:
        '先问假设从哪里来：收入假设的依据、成本预算是否有报价、软成本和融资条件是否完整且已验证、建设周期是否合理、退出 Cap Rate 是否有市场依据、是否做了 downside case，以及 LP / GP 分配后投资人实际拿到什么、项目延期或超支时由谁承担风险。'
    }
  ],
  // 本文为指标概念解释，正文未引用外部数据或统计；未找到可核实正文内容的官方术语页，故不列外部来源。
  sourceList: [],
  en: {
    title: 'How should investors read Cap Rate, IRR and ROE in US real estate?',
    directAnswer:
      'Cap Rate, IRR and ROE are outputs of a set of assumptions, not promises of return, and they cannot replace judgment about the project itself. Cap Rate is usually expressed as NOI divided by property value and works more like a market pricing language; IRR measures how efficiently cash flows perform over time and is highly sensitive to schedule and exit assumptions; ROE measures return on equity and is often amplified by leverage, which amplifies risk as well. Before relying on any of these figures, investors should test the underlying income, cost, financing, timing and exit assumptions one by one.',
    faq: [
      {
        question: 'What is a cap rate, and is it the return on a project?',
        answer:
          'A cap rate (capitalization rate) is generally expressed as Cap Rate = NOI / Property Value, or Property Value = NOI / Cap Rate. It is not a fixed or guaranteed return; it is the market’s way of pricing risk, growth and asset quality, used to compare prices across assets, locations and risk levels.'
      },
      {
        question: 'Why does the exit cap rate assumption matter so much?',
        answer:
          'For development and value-add projects, exit value is often calculated from projected NOI and an exit cap rate. A lower exit cap rate inflates the valuation; if interest rates rise, buyers thin out or local risk increases, the exit cap rate may rise and the valuation falls. Exit assumptions should be backed by comparable transactions and stress-tested.'
      },
      {
        question: 'What are the limits of IRR?',
        answer:
          'IRR captures the timing of money in and money out, but looking at IRR alone can hide total profit, downside protection, cash-flow volatility, delay risk, exit assumptions and the LP / GP split. Short schedules, thin budgets, optimistic rents or sale prices and low exit cap rates all push a model’s IRR up.'
      },
      {
        question: 'Does a high ROE mean a good project?',
        answer:
          'Not necessarily. A high ROE may reflect project quality, or it may simply reflect high leverage. Leverage adds interest-rate and refinancing risk, reduces the margin of safety and makes a project more vulnerable in a downturn, so ROE has to be read together with the capital structure and who bears the risk.'
      },
      {
        question: 'What should an investor ask first when reviewing a financial model?',
        answer:
          'Ask where each assumption comes from: the basis for income, whether costs are backed by bids, whether soft costs and financing terms are complete and verified, whether the schedule is realistic, whether the exit cap rate has market support, whether a downside case exists, what investors actually receive after the LP / GP split, and who bears the risk if the project is delayed or over budget.'
      }
    ]
  }
};

export default data;
