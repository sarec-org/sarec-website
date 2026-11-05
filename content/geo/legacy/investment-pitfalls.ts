import type { LegacyResearchGeo } from '../../../lib/geo/types';

const data: LegacyResearchGeo = {
  slug: 'investment-pitfalls',
  title: '华人投资美国房产，这7类风险最容易被忽视',
  description:
    'SAREC 总结华人投资美国房产最容易被忽视的 7 类风险：合伙人核查、律师审查、资金合规、周期预期、投资结构、退出机制与汇率回流。',
  directAnswer:
    '华人投资美国房产最容易被忽视的 7 类风险是：合伙人背景未独立核查、法律文件未经独立律师审查、资金来源合规准备不足、对开发周期预期不现实、投资结构选错、退出机制不清晰，以及汇率和资金回流风险。这些风险都不是市场不好造成的，可以通过尽调、合适的结构和独立顾问来规避。',
  faq: [
    {
      question: '为什么要独立核查合伙人背景？',
      answer:
        '项目方提供的资料通常是最好看的版本。开发商过去的项目是否按时完工、有无诉讼记录、关联方是否复杂，这些在美国公开数据库里都能查到，但很多投资人没有去查。',
    },
    {
      question: '认购协议为什么必须找独立律师审查？',
      answer:
        '认购协议通常有几十页，可能包含向 GP 倾斜的优先分配安排、限制退出的锁定期条款，以及免除开发商责任的豁免条款。只看项目方提供的“要点摘要”而不找独立律师，等于蒙眼签字。',
    },
    {
      question: 'EB-5 申请中资金来源证明要注意什么？',
      answer:
        '资金合法来源证明（Source of Funds）是 USCIS 审查的重点之一。赠与款、出售资产所得、股权转让收入等每一笔都需要完整的文件链条，应尽早准备，而不是签约后再补材料。',
    },
    {
      question: '如何避免对美国开发周期预期不现实？',
      answer:
        '美国的许可审批（Entitlement）可能需要数年，具体视项目和辖区而定，期间资金锁定、市场也可能变化。应按偏保守的周期估算来计划，并预留足够的时间和资金缓冲。',
    },
    {
      question: '投资结构和退出机制为什么要先想清楚？',
      answer:
        'EB-5、直接购房、房地产基金和夹层融资的风险、流动性和税务处理各不相同，应先确定“用什么结构投”，再选“投什么项目”。进场前还要弄清何时可以退出、谁来接手份额、锁定期多长；项目方无法给出清晰的退出安排，本身就是风险信号。',
    },
  ],
  sourceList: [
    {
      name: 'USCIS Policy Manual, Volume 6, Part G, Chapter 2 - Immigrant Petition Eligibility Requirements（资金合法来源）',
      url: 'https://www.uscis.gov/policy-manual/volume-6-part-g-chapter-2',
      accessedAt: '2026-11-05',
    },
    {
      name: 'SEC / USCIS Investor Alert: Investment Scams Exploit Immigrant Investor Program',
      url: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/investor-51',
      accessedAt: '2026-11-05',
    },
    {
      name: 'PACER: Public Access to Court Electronic Records（美国联邦法院公开记录）',
      url: 'https://pacer.uscourts.gov/',
      accessedAt: '2026-11-05',
    },
  ],
  en: {
    title: 'What are the 7 most overlooked risks for Chinese investors in U.S. real estate?',
    directAnswer:
      'The seven most overlooked risks are: not independently vetting partners, signing legal documents without independent counsel, under-preparing source-of-funds compliance, unrealistic expectations about U.S. development timelines, choosing the wrong investment structure, an unclear exit, and currency and repatriation risk. None of these is caused by a weak market; all can be mitigated through due diligence, the right structure, and independent advisors.',
    faq: [
      {
        question: 'Why vet partners independently?',
        answer:
          'Sponsor materials are always the best-looking version. Whether past projects finished on time, whether there is litigation, and how complex the related parties are can all be checked in U.S. public records, yet many investors never look.',
      },
      {
        question: 'Why does a subscription agreement need independent legal review?',
        answer:
          'These agreements often run dozens of pages and can include preferred distribution terms that favor the GP, lock-up clauses that prevent exit, and exculpation clauses that limit the developer\'s liability. Relying on the sponsor\'s summary instead of independent counsel is signing blind.',
      },
      {
        question: 'What should EB-5 applicants know about source of funds?',
        answer:
          'Lawful source of funds is a key focus of USCIS review. Gifts, asset sale proceeds, and equity transfer income each need a complete paper trail, so start early rather than assembling documents after signing.',
      },
      {
        question: 'How should investors plan for U.S. development timelines?',
        answer:
          'Entitlement can take years depending on the project and jurisdiction, during which capital is locked up and the market may change. Plan on conservative timeline estimates and leave a time and capital buffer.',
      },
      {
        question: 'Why decide on structure and exit first?',
        answer:
          'EB-5, direct purchase, real estate funds, and mezzanine financing differ in risk, liquidity, and tax treatment, so decide how to invest before choosing what to invest in. Also confirm when you can exit, who will buy your interest, and how long the lock-up is; a sponsor without a clear exit plan is itself a warning sign.',
      },
    ],
  },
};

export default data;
