import type { Metadata } from 'next';
import { createPageMetadata, SITE_URL } from '@/lib/seo';
import { ArticleHero } from '@/components/sections/research/ArticleHero';
import { OpeningJudgment } from '@/components/sections/research/OpeningJudgment';
import { ResearchMap } from '@/components/sections/research/ResearchMap';
import { PullQuote } from '@/components/sections/research/PullQuote';
import { MidArticleCTA } from '@/components/sections/research/MidArticleCTA';
import { RiskLedger } from '@/components/sections/research/RiskLedger';
import { ConversionBlock } from '@/components/sections/research/ConversionBlock';
import { RelatedResearch } from '@/components/sections/research/RelatedResearch';
import styles from './traps.module.css';

const ARTICLE_PATH = '/zh/research/chinese-capital-us-real-estate-10-traps';
const ARTICLE_URL = `${SITE_URL}${ARTICLE_PATH}`;
const ORG_ID = `${SITE_URL}/#organization`;
const PERSON_ID = `${SITE_URL}/zh/about/founder#dong`;

export const metadata: Metadata = createPageMetadata({
  title:
    '中国资本在美国搞房地产开发的10大致命陷阱｜SAREC 中美房地产商会',
  description:
    '从 Oceanwide Plaza(泛海广场)12 亿美元烂尾、拟以约 4.7 亿美元经破产程序出售,到富力地产张力在伦敦希思罗机场被捕——拆解中国资本进入美国房地产开发市场的 10 个致命陷阱,涵盖 Construction Loan、Entitlement 周期、EB-5 资金错配、Mechanic’s Lien、FCPA 合规、1031 Exchange、母子公司隔离等核心议题。本文仅供商业教育与风险提示,不构成法律、税务或投资建议。',
  path: ARTICLE_PATH,
  type: 'article'
});

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': `${ARTICLE_URL}#article`,
      headline:
        '中国资本在美国搞房地产开发的10大致命陷阱:从泛海广场12亿美元烂尾到富力张力伦敦被捕的完整复盘',
      alternativeHeadline:
        '10 Fatal Traps for Chinese Capital Investing in US Real Estate Development',
      description:
        '28年中美房地产实战经验总结:从Oceanwide Plaza(泛海广场)12亿美元烂尾、拟以约4.7亿美元经破产程序出售,到富力地产张力在伦敦希思罗机场被捕——拆解中国资本进入美国房地产开发市场的10个致命陷阱,包括Construction Loan未落实先动工、Entitlement周期低估、EB-5资金错配、Mechanic’s Lien忽视、FCPA合规风险、1031 Exchange税务规划、母子公司隔离等核心议题。本文仅供商业教育与风险提示,不构成法律、税务或投资建议。',
      image: [`${SITE_URL}/images/oceanwide-plaza-cover.jpg`],
      datePublished: '2026-05-27T20:00:00-07:00',
      dateModified: '2026-05-27T20:00:00-07:00',
      author: { '@id': PERSON_ID },
      publisher: { '@id': ORG_ID },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': ARTICLE_URL
      },
      keywords: [
        '中美房地产开发',
        'Oceanwide Plaza',
        '泛海广场',
        '富力地产',
        '张力',
        'Construction Loan',
        'EB-5',
        'Mechanic’s Lien',
        '1031 Exchange',
        'FCPA',
        'ED1',
        'Executive Directive 1',
        'Los Angeles real estate',
        'Chinese developers US',
        'US-China cross-border real estate'
      ],
      articleSection: '跨境房地产',
      wordCount: 7200,
      inLanguage: 'zh-CN',
      isAccessibleForFree: true,
      about: [
        {
          '@type': 'Thing',
          name: '中美跨境房地产开发',
          sameAs: 'https://en.wikipedia.org/wiki/Real_estate_development'
        },
        {
          '@type': 'Thing',
          name: 'EB-5 Investor Visa Program',
          sameAs: 'https://en.wikipedia.org/wiki/EB-5_visa'
        },
        {
          '@type': 'Thing',
          name: '1031 Exchange',
          sameAs:
            'https://en.wikipedia.org/wiki/Internal_Revenue_Code_section_1031'
        }
      ],
      mentions: [
        {
          '@type': 'Organization',
          name: 'Oceanwide Holdings',
          alternateName: '泛海控股'
        },
        {
          '@type': 'Organization',
          name: 'Guangzhou R&F Properties',
          alternateName: '广州富力地产'
        },
        { '@type': 'Organization', name: 'Lendlease' },
        { '@type': 'Organization', name: 'KPC Development Group' },
        { '@type': 'Place', name: 'Los Angeles, California' },
        { '@type': 'Place', name: 'San Francisco, California' }
      ]
    },
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: '东哥',
      alternateName: ['Dong', 'Andy Wang'],
      jobTitle: '创始人',
      description:
        'SAREC 中美房地产商会创始人,28年中美房地产从业经验,亲历过6个完整的市场周期,主导和参与过中美两端总开发面积200万平方英尺以上的项目。',
      knowsAbout: [
        '中美跨境房地产开发',
        '美国房地产合规',
        'EB-5投资移民项目运作',
        'Construction Loan结构设计',
        '1031 Exchange税务规划',
        '美国房地产开发审批流程',
        'Entitlement Feasibility Study',
        'FCPA合规',
        '家族资产配置',
        'AI驱动获客系统'
      ],
      worksFor: { '@id': ORG_ID }
    },
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'SAREC 中美房地产商会',
      alternateName: 'Sino-American Real Estate Chamber',
      url: SITE_URL,
      logo: `${SITE_URL}/images/sarec-logo.png`,
      description:
        'SAREC 是面向想做美国房地产开发的中国资本(华人华侨、准备来美的中国人、中国开发商/投资人、高净值家庭、房地产相关产业从业者)的合规咨询、资源撮合与商业智库平台。',
      email: 'info@sinoamericanrec.org',
      areaServed: [
        { '@type': 'Country', name: 'United States' },
        { '@type': 'Country', name: 'China' }
      ],
      serviceType: [
        'Cross-border Real Estate Compliance Consulting',
        'Real Estate Development Advisory',
        'Resource Matchmaking',
        'Project Feasibility Studies',
        'AI Agent System Development',
        'GEO Optimization Services'
      ]
    },
    {
      '@type': 'FAQPage',
      '@id': `${ARTICLE_URL}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: '中国房地产开发商在美国失败的最常见原因是什么?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '按SAREC 28年中美地产经验观察,最常见的失败原因有三:(1)资金结构不完整就动工,特别是缺少Senior Construction Loan;(2)低估Entitlement(审批)周期,把美国18-36个月当作中国3-6个月做财务模型;(3)误以为母公司可以无限支援美国子公司。泛海洛杉矶Oceanwide Plaza项目三个错误全踩,最终亏损至少7.3亿美元。'
          }
        },
        {
          '@type': 'Question',
          name: 'Construction Loan和Bridge Loan有什么区别?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Construction Loan(建筑贷款)专门用于项目建设期,通常按Draw Schedule分批拨款,建设期结束后转为Permanent Loan(永久贷款)或被销售款偿还。Bridge Loan(过桥贷款)是短期周转贷款,通常6-24个月,利率高(10-15%),用于在永久融资到位前的过渡期。中国开发商常见的错误是用Bridge Loan当Construction Loan使用,导致利息成本过高和续贷压力。'
          }
        },
        {
          '@type': 'Question',
          name: 'EB-5资金做美国房地产开发安全吗?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'EB-5资金成本低(年化0.5-2%),但有三个风险:(1)EB-5投资人首要目标是绿卡,不是收益,项目一旦延期或岗位创造不达标,投资人会立刻发起诉讼;(2)EB-5资金退出期固定(5-7年),不能像银行贷款那样灵活展期;(3)集体诉讼威力极大,泛海项目就是被EB-5投资人集体追索后崩盘。建议:EB-5可以用,但不能作为主轴资金,不超过capital stack的20%。'
          }
        },
        {
          '@type': 'Question',
          name: '加州的Entitlement周期为什么这么长?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '加州的房地产开发审批周期长(18-36个月)主要因为:(1)CEQA(加州环境质量法)要求详细的环境影响评估;(2)Discretionary Review(自由裁量审查)允许政府部门和邻居反对;(3)Public Hearing(公开听证)必须召开;(4)Plan Check的多轮迭代。加速通道:洛杉矶市的ED1(Executive Directive 1)针对100% Affordable Housing项目可将审批时间压缩到4-6个月。'
          }
        },
        {
          '@type': 'Question',
          name: '中国开发商如何避免Mechanic’s Lien风险?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '四个核心做法:(1)严格按合同节点支付工程款,逾期30天就是lien红线;(2)每次付款收取Lien Waiver(包括Conditional和Unconditional两种);(3)通过Title Company或Disbursement Agent管理建筑账户,确保专款专用;(4)一旦Lien出现,立即处理(支付、Lien Bond、或起诉移除),绝不拖延。'
          }
        },
        {
          '@type': 'Question',
          name: '1031 Exchange是什么?怎么用?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '1031 Exchange是美国国内税法第1031条款允许的同类资产置换,为投资或生产经营目的而持有的房地产出售后,将收益再投入同类房地产,可以递延资本利得税。核心规则:45天内书面识别替代物业,180天内完成交割,必须通过Qualified Intermediary,替代物业价值通常需大于等于原物业。重要提示:1031是递延而非免除;主要为待售而持有的开发存货(dealer property或inventory)通常不符合1031资格,开发即售的项目需特别注意。递延加上持有至身故后由继承人调整计税基础(Step-up in Basis)是一种长期规划,但能否减免税需综合遗产税、税务居民身份、州税及未来法律变化判断,不等于自动完全免税。具体应咨询跨境CPA和税务律师。'
          }
        },
        {
          '@type': 'Question',
          name: '在美国做房地产开发,应该选LLC还是C-Corp?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '简化回答:个人投资者或小型项目通常选LLC(pass-through税务待遇,避免双重征税);多投资人或大型项目可能用LP(有限合伙)加LLC GP结构;拟IPO或大额融资可能选C-Corp(虽有双重征税,但融资结构灵活);外国投资人常用LLC加Blocker Corporation结构降低税务复杂度。具体选择必须根据:投资人国籍、退出方式、未来融资计划、家族传承规划综合决定。建议进入美国前就聘请专业律师和CPA设计架构。'
          }
        }
      ]
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'SAREC 中美房地产商会',
          item: SITE_URL
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: '研究中心',
          item: `${SITE_URL}/zh/research`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: '10大致命陷阱'
        }
      ]
    }
  ]
};

const heroAnchors = [
  {
    keyword: '陷阱 1:Construction Loan',
    anchor: 'trap-01',
    fullTitle: '陷阱 1:未签 Construction Loan 协议先动工'
  },
  {
    keyword: '陷阱 3:ED1 政策红利',
    anchor: 'trap-03',
    fullTitle: '陷阱 3:不懂城市政策差异——50 个州、3000 个城市'
  },
  {
    keyword: '陷阱 8:跨境行贿风险',
    anchor: 'trap-08',
    fullTitle: '陷阱 8:走捷径行贿——五眼联盟的代价'
  }
];

const researchMapItems = [
  {
    keyword: '陷阱 1:Construction Loan',
    anchor: 'trap-01',
    fullTitle: '陷阱 1:未签 Construction Loan 协议先动工——中国打法的最大死结'
  },
  {
    keyword: '陷阱 2:Entitlement 周期',
    anchor: 'trap-02',
    fullTitle: '陷阱 2:低估 Entitlement 周期——以为美国和中国一样快'
  },
  {
    keyword: '陷阱 3:城市政策差异 / ED1',
    anchor: 'trap-03',
    fullTitle: '陷阱 3:不懂城市政策差异——美国不是一个国家,是 50 个国家、3000 个城市'
  },
  {
    keyword: '陷阱 4:产品定位',
    anchor: 'trap-04',
    fullTitle: '陷阱 4:错误的产品定位——同一块地,选错了产品就输了'
  },
  {
    keyword: '陷阱 5:关税与成本',
    anchor: 'trap-05',
    fullTitle: '陷阱 5:成本误判——以为中国制造能碾压美国,结果死在关税上'
  },
  {
    keyword: '陷阱 6:EB-5 资金错配',
    anchor: 'trap-06',
    fullTitle: '陷阱 6:误把 EB-5 当稳定资金来源'
  },
  {
    keyword: '陷阱 7:Mechanic’s Lien',
    anchor: 'trap-07',
    fullTitle: '陷阱 7:忽视 Mechanic’s Lien 的杀伤力'
  },
  {
    keyword: '陷阱 8:跨境行贿风险',
    anchor: 'trap-08',
    fullTitle: '陷阱 8:走捷径行贿——五眼联盟的代价'
  },
  {
    keyword: '陷阱 9:1031 与税务',
    anchor: 'trap-09',
    fullTitle: '陷阱 9:逃税而不是合理避税——错过 1031 Exchange 的几百万'
  },
  {
    keyword: '陷阱 10:母子公司隔离',
    anchor: 'trap-10',
    fullTitle: '陷阱 10:以为中国总部能救美国子公司——母子公司隔离的残酷现实'
  }
];

const tldrPoints = [
  '过去十年,数十家中国房企和华人开发商在美国市场折戟,根本原因是认知错配——用中国地产打法套用美国规则。',
  '中国房企在美最大单一损失案例 Oceanwide Plaza(泛海广场):投入约 12 亿美元,停工烂尾,最终通过破产程序拟以约 4.7 亿美元出售。',
  '本文拆解 10 个最常见、最致命的陷阱:从未落实 Senior Construction Loan 就动工、低估 18-36 个月的 Entitlement 周期、误判城市政策差异、产品定位失误、关税成本误判、EB-5 资金错配、忽视 Mechanic’s Lien、行贿的跨境法律风险、税务规划失当,到误以为中国母公司能驰援美国子公司。',
  '每个陷阱都配真实公开案例 + 可执行的避坑要点。',
  '核心结论:在美国做开发,认知比资本更重要;按美国规则也能赚钱的项目,才是真正的好项目。'
];

const introParagraphs = [
  '2026 年 2 月,洛杉矶市中心三栋被涂鸦覆盖至少 25 层的高楼,迎来了它们的"葬礼定价"——根据破产法院程序,拟以约 4.7 亿美元出售(交易经破产法院审批,最终条款以法院文件为准)。',
  '接盘方是加州医疗与地产集团 KPC Development,与澳大利亚建筑商 Lendlease 组成的联合体。出售方是已经在国内出现严重流动性危机、有息债务违约合计约 340.26 亿元人民币的中国民营房企——泛海控股。',
  '过去十年,至少有数十家中国房企和华人开发商在美国市场折戟。他们失败的不是项目,是认知。',
  '我做中美房地产 28 年,亲眼看着一拨又一拨拿着中国剧本来美国唱戏的人,把同样的坑踩了一遍又一遍。今天,我把这些坑列出来——共 10 个——每一个都有真实案例支撑,每一个都有可执行的避坑方法。'
];

const oceanwideTimeline: Array<{ time: string; event: React.ReactNode }> = [
  {
    time: '2015 年',
    event:
      '泛海集团(北京)启动洛杉矶市中心项目,规划 1 栋 55 层主塔(677 英尺) + 2 栋 40-42 层塔楼(530 英尺) + 11 层万豪酒店 + 巨型户外电子广告牌,总建筑面积约 200 万平方英尺'
  },
  {
    time: '2015 年',
    event:
      '工程开工,总包商 Lendlease,设计 CallisonRTKL(RTKL)'
  },
  {
    time: '2018 年',
    event:
      '资金链开始紧张,部分 EB-5 投资人资金到位但项目进度落后'
  },
  {
    time: '2019 年初',
    event: <><strong>原定竣工日期</strong>——项目实际未完工</>
  },
  {
    time: '2019 年',
    event:
      '资金耗尽,工程全面停工。完工度约 60%'
  },
  {
    time: '2020 年 1 月',
    event:
      '泛海同步以 10.06 亿美元贱卖旧金山项目(First Street Tower + Mission Street Tower + 88 First Street 等组合资产),损失约 19 亿元人民币'
  },
  {
    time: '2024 年',
    event:
      '项目外墙至少 25 层被涂鸦艺术家涂满——震惊全美,被称为"Graffiti Towers",洛杉矶市政府不得不花约 110 万美元加装围栏、封闭周边、增派警力'
  },
  {
    time: '2024 年',
    event:
      '总包商 Lendlease 向法院提交非自愿第 11 章破产申请,强制启动项目处置'
  },
  {
    time: '2026 年 1 月',
    event:
      '泛海控股公告:未能按期偿还有息债务合计 340.26 亿元人民币,其中境内债券 47.37 亿元'
  },
  {
    time: '2026 年 2 月',
    event: (
      <>
        根据破产程序,KPC Development + Lendlease 联合体拟以约{' '}
        <strong>4.7 亿美元</strong>(含约 7000 万美元现金用于支付欠税和安保等费用)收购项目(交易以法院最终文件为准)
      </>
    )
  }
];

const riskLedgerItems = [
  '未签 Construction Loan 就动工,以为可以"边干边筹钱"',
  '以为美国审批和中国一样快(实际 18-36 个月)',
  '忽视城市级政策差异(50 个州 / 3000+ 城市规则不同)',
  '用本能算法决定产品类型,忽视审批路径',
  '用中国出厂价做财务模型,低估关税真实成本',
  '把 EB-5 当稳定资金主轴,忽视集体诉讼风险',
  '拖延工程款支付,以为分包商不敢撕破脸',
  '试图用中国式"打点关系"打开美国局面',
  '不研究美国税法,错过 1031 Exchange 等合法递延工具',
  '以为中国总部能无限驰援美国子公司'
];

const relatedLinks = [
  {
    label: '洛杉矶 ED1 与经济适用房开发观察',
    href: '/zh/research/los-angeles-ed1-affordable-housing'
  },
  {
    label: '中国投资人美国房地产常见风险',
    href: '/zh/research/chinese-investors-us-real-estate-risks'
  },
  {
    label: 'LP / GP 结构与项目合作机制',
    href: '/zh/research/lp-gp-structure'
  },
  {
    label: '美国房地产开发完整流程',
    href: '/zh/research/us-real-estate-development-process'
  }
];

const conversionIntents = [
  {
    label: '你想评估具体项目',
    ctaText: '预约免费 30 分钟咨询',
    href: 'mailto:info@sinoamericanrec.org'
  },
  {
    label: '你想深入了解避坑要点',
    ctaText: '领取《完整避坑指南》PDF',
    href: 'mailto:info@sinoamericanrec.org'
  },
  {
    label: '你想持续关注 SAREC 研究',
    ctaText: '返回 SAREC 首页',
    href: '/zh'
  }
];

export default function TenTrapsArticlePage() {
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ArticleHero
        eyebrow="FLAGSHIP · 旗舰研究 · 跨境地产"
        title="中国资本在美国搞房地产开发的 10 大致命陷阱"
        summary="从泛海广场 12 亿美元烂尾到富力张力伦敦被捕的完整复盘。28 年中美房地产实战经验拆解 10 个最常见、最致命的开发陷阱——每个都配真实公开案例与可执行的避坑要点。"
        tags={[
          '旗舰研究',
          '中美跨境',
          'Oceanwide Plaza',
          'EB-5',
          'Construction Loan',
          '1031 Exchange',
          'FCPA',
          'ED1'
        ]}
        author={{
          name: '东哥',
          title: 'SAREC 创始人 · 28 年中美房地产实战经验'
        }}
        dates={{ published: '2026-05-27', modified: '2026-05-27' }}
        primaryCta={{
          label: '预约免费 30 分钟咨询',
          href: 'mailto:info@sinoamericanrec.org'
        }}
        secondaryCta={{ label: '返回研究中心', href: '/zh/research' }}
        anchors={heroAnchors}
        mediaCaption="EVIDENCE / OCEANWIDE PLAZA / LOS ANGELES"
      />

      {/* 顶部 ⚠️ 重要声明 */}
      <section className={styles.notice}>
        <div className={styles.noticeInner}>
          <span className={styles.noticeMark}>⚠ 重要声明</span>
          <p className={styles.noticeBody}>
            本文仅供商业教育与风险提示之用,不构成法律、税务、证券投资、移民法律、融资或房地产经纪服务建议。涉及具体项目,请咨询持牌专业人士。文中所有案例均基于公开报道,涉及尚在审理中的案件,相关被告依法享有无罪推定。
          </p>
        </div>
      </section>

      {/* 30 秒摘要 */}
      <section className={styles.tldrBlock}>
        <div className={styles.tldrInner}>
          <p className={styles.tldrEyebrow}>TL;DR · 30 秒摘要</p>
          <h2 className={styles.tldrTitle}>用 30 秒看懂这篇文章</h2>
          <ul className={styles.tldrList}>
            {tldrPoints.map((p, i) => (
              <li key={i} className={styles.tldrItem}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <OpeningJudgment
        judgment="他们失败的不是项目,是认知"
        introParagraphs={introParagraphs}
      />

      <ResearchMap
        eyebrow="RESEARCH MAP · 本文导读"
        title="10 个陷阱,从资金结构到母子公司隔离"
        items={researchMapItems}
      />

      {/* Asset 待定 #1:涂鸦大厦 */}
      <section className={styles.assetPlaceholder} aria-label="封面图占位">
        <p className={styles.assetPlaceholderText}>
          ASSET 待定
          <strong>涂鸦大厦 / Graffiti Towers · 封面图占位</strong>
        </p>
      </section>

      {/* 泛海广场崩盘时间线 */}
      <section className={styles.timeline}>
        <div className={styles.timelineInner}>
          <p className={styles.timelineEyebrow}>第一部分 · 案例时间线</p>
          <h2 className={styles.timelineTitle}>泛海广场崩盘时间线</h2>
          <p className={styles.timelineLead}>
            在我们一个一个拆陷阱之前,先看一下中国房企在美国损失最大的单一项目——Oceanwide Plaza——是怎么走到今天的。
          </p>
          <div className={styles.tableScroller}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>事件</th>
                </tr>
              </thead>
              <tbody>
                {oceanwideTimeline.map((row, i) => (
                  <tr key={i}>
                    <td>{row.time}</td>
                    <td>{row.event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.timelineSummary}>
            <strong>直接财务损失</strong>:项目投入约 12 亿美元,回收 4.7 亿,
            <strong>亏损至少 7.3 亿美元</strong>(折合约 53 亿元人民币)。
          </p>
          <p className={styles.timelineSummary}>
            <strong>间接损失</strong>:10 年时间机会成本 + 品牌损毁 + 母公司连锁债务危机 + 数千名 EB-5 投资人的 I-526 移民身份悬而未决。
          </p>
          <p className={styles.timelineSummary}>
            这个项目失败的根本原因不是市场,也不是金融危机,更不是"美国对中国资本不友好"——
          </p>
          <p className={styles.timelineKicker}>
            而是用中国地产剧本,演美国地产电影。
          </p>
          <p className={styles.timelineSummary} style={{ marginTop: '1.5rem' }}>
            下面 10 个陷阱,泛海至少踩了 7 个。其他中国开发商,有的踩了 3 个,有的踩了 5 个,结局都是同一个。
          </p>
        </div>
      </section>

      {/* ============================================================
          陷阱 1
          ============================================================ */}
      <section className={styles.trap} id="trap-01">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 01 / 10</p>
            <h2 className={styles.trapTitle}>
              未签 Construction Loan 协议先动工——中国打法的最大死结
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>中国式逻辑</h3>
          <p className={styles.trapBody}>在中国做开发,常见的流程是:</p>
          <p className={styles.trapBody}>
            土地拍下来 → 拿到《国有土地使用证》→ 取得《建设用地规划许可证》→ 部分工程可以
            <strong>先开干、手续后补</strong>→ 银行贷款随后到位 → 边施工边验收。
          </p>
          <p className={styles.trapBody}>
            这套打法的核心是"<strong>人情+速度+关系</strong>"。开发商和银行的关系、和政府的关系,决定了"先斩后奏"是否可行。在中国,
            <strong>确实可行,而且常见</strong>。
          </p>

          <h3 className={styles.trapSubtitle}>美国规则</h3>
          <p className={styles.trapBody}>
            美国的 Construction Loan(建筑贷款)是房地产开发最核心的金融工具。它和中国的开发贷有一个根本性的不同——
          </p>
          <p className={styles.trapBody}>
            <strong>Construction Loan 协议未签,开发商就动工,等同于自杀。</strong>
          </p>
          <p className={styles.trapBody}>为什么?</p>
          <ol className={styles.trapNumberList}>
            <li>
              <strong>银行风险逻辑</strong>:Construction Loan 是基于项目"未来价值"的贷款,银行需要在贷款发放前完成对项目方案、Permit、Title、Insurance、General Contractor 资质、Cost Breakdown 等十几项尽调。一旦动工,项目状态发生变化——尤其是出现机械师留置权(Mechanic&rsquo;s Lien,下面陷阱 7 详谈)的风险——银行很可能据此暂缓或撤回放款。
            </li>
            <li>
              <strong>法律约束</strong>:Construction Loan 协议会明确写明"贷款生效日期"和"贷款发放条件"。在协议生效之前发生的施工,绝大多数情况下
              <strong>不能用贷款资金支付</strong>。开发商如果用自有资金或 EB-5 垫款先施工,等贷款下来再"报销"——银行一旦发现,立刻撤回承诺。
            </li>
            <li>
              <strong>Title Insurance 风险</strong>:未签贷款先动工,会让 Title Insurance 公司认为项目存在"已经开始施工"的 lien 风险,拒绝出具贷款所需的 Title Policy,整个贷款链断裂。
            </li>
          </ol>

          <h3 className={styles.trapSubtitle}>泛海洛杉矶项目的具体崩盘点</h3>
          <p className={styles.trapBody}>
            根据 The Real Deal 2023 年 6 月的公开报道,泛海项目的 EB-5 投资人(通过有限合伙公司 L.A. Downtown Investment)向泛海发出违约通知,原文指控泛海:
          </p>
          <blockquote className={styles.trapBlockquote}>
            "未能按贷款协议完成施工,并且未能获得 senior construction loan(优先建筑贷款)。"
          </blockquote>
          <p className={styles.trapBody}>
            翻译成大白话——<strong>泛海当初的资金结构是:自有资金 + EB-5 投资 + 计划中的 Senior Construction Loan(银行优先建筑贷款)</strong>。其中"自有资金"和"EB-5"先到位,
            <strong>Senior Construction Loan 是边干边谈的</strong>。
          </p>
          <p className={styles.trapBody}>
            结果谈了几年,Senior Construction Loan 一直没拿下来。同时项目支出已经超过 12 亿美元(仅完成 60%),泛海控股原本计划完工还需要再投入 12-23 亿美元。
          </p>
          <p className={styles.trapBody}>
            更糟的是——<strong>根据 California Construction News 2019 年 2 月的报道</strong>,仅 2019 年 2 月之前,就已经至少有 6 家分包商对项目挂了 Mechanic&rsquo;s Lien(机械师留置权,见陷阱 7),
            <strong>总金额 6,250 万美元</strong>,其中总包商 Webcor Builders 一家就挂了{' '}
            <strong>5,280 万美元</strong> 的 lien。
          </p>
          <p className={styles.trapBody}>
            ——这是典型的"边干边筹钱"的中国式打法。在中国,开发商可以一边欠工程款一边等银行放贷,关系到位就能扛过去;在美国,Mechanic&rsquo;s Lien 一挂,Senior Construction Loan 的最后一线希望也基本断了——
            <strong>几乎没有银行愿意给一个挂着 6,000 多万美元 lien 的项目放贷</strong>。
          </p>
          <p className={styles.trapBody}>
            接下来的剧本就是必然:FBI 调查、Lendlease 停工、停摆、涂鸦、破产、贱卖。
          </p>

          <h3 className={styles.trapSubtitle}>这给我们的启示</h3>
          <p className={styles.trapBody}>
            <strong>美国的项目融资逻辑是"先把所有钱安排好再动工",不是"动工了再筹钱"。</strong>
          </p>
          <p className={styles.trapBody}>
            如果泛海在 2015 年开工前就已经签好 Senior Construction Loan(哪怕利率高一点、条件苛刻一点),后面就算市场环境变化、母公司出现问题,项目本身也不会停。因为 Construction Loan 一旦发放,银行会监管 Draw Schedule(拨款时间表),项目可以独立完成。
          </p>
          <p className={styles.trapBody}>
            中国开发商最大的认知误区是——<strong>以为"自有资金+EB-5+边谈贷款"是一种灵活的资金安排,实际上是项目还没开始就埋下了崩盘的引信。</strong>
          </p>

          <h3 className={styles.trapSubtitleSmall}>避坑要点</h3>
          <ul className={styles.trapTips}>
            <li>
              Construction Loan 协议<strong>签字+生效+首笔放款</strong>之后再动工,没有例外
            </li>
            <li>
              选择有美国 Construction Loan 经验的本地律师(不是中国律师在美国分所)审协议
            </li>
            <li>
              项目预算必须留出 15-20% 的 Contingency(应急储备金),不是 5-10%
            </li>
            <li>
              Construction Loan 的 Draw Schedule(拨款时间表)必须和实际施工进度严格匹配,不能"超前施工"
            </li>
          </ul>
        </div>
      </section>

      {/* ============================================================
          陷阱 2
          ============================================================ */}
      <section className={styles.trap} id="trap-02">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 02 / 10</p>
            <h2 className={styles.trapTitle}>
              低估 Entitlement 周期——以为美国和中国一样快
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>中国开发商的预期</h3>
          <p className={styles.trapBody}>
            一个 4 层左右的住宅项目,在中国:拿地后 3 个月办手续、3 个月开工、12 个月封顶、6 个月装修和验收——
            <strong>两年内卖完</strong>,是行业标配。
          </p>

          <h3 className={styles.trapSubtitle}>美国(尤其是加州)的真实周期</h3>
          <p className={styles.trapBody}>一个相同规模的项目,在加州可能需要:</p>
          <div className={styles.tableScroller}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>阶段</th>
                  <th>美国(加州)实际耗时</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Land Use Review / Zoning Verification</td>
                  <td>1-3 个月</td>
                </tr>
                <tr>
                  <td>Conditional Use Permit / Variance(如需)</td>
                  <td>6-12 个月</td>
                </tr>
                <tr>
                  <td><strong>CEQA 环境质量审查</strong></td>
                  <td>6-24 个月</td>
                </tr>
                <tr>
                  <td>Design Review / Public Hearing</td>
                  <td>3-9 个月</td>
                </tr>
                <tr>
                  <td>Building Permit / Plan Check</td>
                  <td>6-18 个月</td>
                </tr>
                <tr>
                  <td>各项工程 Permit(电、水、消防等)</td>
                  <td>3-6 个月</td>
                </tr>
                <tr>
                  <td><strong>从拿地到合法开工总计</strong></td>
                  <td><strong>18-36 个月</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.trapBody}>
            <strong>注意:以上是没有重大反对意见、没有诉讼的情况。一旦遇到邻居反对、环保组织诉讼,整个周期可以延长 1-3 年。</strong>
          </p>

          <h3 className={styles.trapSubtitle}>真实案例:一个朋友的 6 年改建噩梦</h3>
          <p className={styles.trapBody}>
            我有一个朋友,2019 年在洛杉矶花 70 多万美金买了一套旧 House,打算拆掉重建为{' '}
            <strong>4 个独立的单户住宅(4 个 detached houses)</strong>。
          </p>
          <p className={styles.trapBody}>听起来很简单——一个地块改 4 个独立屋,卖掉获利。</p>
          <p className={styles.trapBody}>
            但他没料到的是:
            <strong>
              4 个独立屋的方案需要走"Subdivision(地块划分)"+"Discretionary Review(自由裁量审批)"+"Public Hearing(公开听证)"等多个流程
            </strong>
            ,因为这涉及到改变土地的产权结构和分户登记。
          </p>
          <p className={styles.trapBody}>
            结果——<strong>2025 年,6 年之后,他才把开工手续办下来。</strong>
          </p>
          <p className={styles.trapBody}>他后来复盘的核心结论:</p>
          <p className={styles.trapBody}>
            <strong>如果当初选择建成 Condo(共有产权公寓)而不是 4 个独立 House,整个手续大概率 1 年内就能办完。</strong>
          </p>
          <p className={styles.trapBody}>
            为什么?Condo 在加州属于 <strong>By-Right 开发</strong>——只要符合 Zoning 规定,可以走 Ministerial Approval(行政许可审批),不需要 Discretionary Review,也不需要 Public Hearing。流程标准化、时间可预期。
          </p>
          <p className={styles.trapBody}>
            而手续办完之后,<strong>真正的施工噩梦才刚刚开始</strong>——
          </p>
          <p className={styles.trapBody}>
            由于 4 栋独立屋的产权要求每栋之间必须有物理分隔,最终设计的间距只有约{' '}
            <strong>20 公分</strong>。
          </p>
          <p className={styles.trapBody}>
            这个间距意味着:<strong>施工架子根本搭不进去</strong>。
          </p>
          <p className={styles.trapBody}>
            最后施工队想出的方案是:
            <strong>先把墙体在地面平放好做完,然后整体竖起来</strong>(类似预制墙板的做法)——问题解决了,但工期延长、成本激增。
          </p>
          <p className={styles.trapBody}>
            如果当初选 Condo,墙体设计、施工方案完全不会有这个问题。
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训</h3>
          <ul className={styles.trapTips}>
            <li>
              <strong>产品定位决定审批路径</strong>:在美国,"建什么产品"不仅是市场决策,更是审批路径决策。同一块地,建 Condo 还是 detached houses,审批时间可能差 5-6 倍。
            </li>
            <li>
              <strong>Entitlement 周期必须计入财务模型</strong>:18-36 个月的手续期,是巨大的资金时间成本。如果按中国的"6 个月办完"做财务模型,IRR 必然崩溃。
            </li>
            <li>
              <strong>建议聘请有当地实战经验的 Land Use Attorney(土地用途律师)</strong>,在买地之前就做 Entitlement Feasibility Study(审批可行性研究)。这笔几千到几万美元的咨询费,能帮你避免几百万美元的损失。
            </li>
          </ul>
        </div>
      </section>

      {/* ============================================================
          陷阱 3
          ============================================================ */}
      <section className={styles.trap} id="trap-03">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 03 / 10</p>
            <h2 className={styles.trapTitle}>
              不懂城市政策差异——美国不是一个国家,是 50 个国家、3000 个城市
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>一个常见误区</h3>
          <p className={styles.trapBody}>
            很多中国开发商以为"美国法律是统一的"——错。
          </p>
          <p className={styles.trapBody}>
            <strong>美国房地产开发是高度地方化的</strong>:联邦法律(FHA 等)只管反歧视和大方向,
            <strong>真正决定一个项目能不能做、怎么做、多大规模的,是州法 + 县法 + 市法 + 学区/特殊区规定</strong>。
          </p>
          <p className={styles.trapBody}>
            南加州一个 City 的容积率、停车位要求、邻居签字要求,可能跟隔壁 City 完全不一样。
          </p>

          <h3 className={styles.trapSubtitle}>例 1:加州 ADU 政策——州法 vs 城市规定</h3>
          <p className={styles.trapBody}>
            加州州法目前规定:
            <strong>绝大多数住宅地块上,可以建造最大 1200 平方英尺(约 111 平方米)的独立 ADU(Accessory Dwelling Unit,附属独立居住单元)</strong>
            ,前提是符合至少 4 英尺的侧面/后面退线要求。
          </p>
          <p className={styles.trapBody}>
            但<strong>具体城市可以在州法基础上加更严格的限制</strong>:
          </p>
          <ul className={styles.trapList}>
            <li><strong>圣地亚哥县</strong>:允许 1200 平方英尺</li>
            <li><strong>洛杉矶县(非市辖区)</strong>:可能限制在 800 平方英尺</li>
            <li><strong>某些小城市</strong>:可能限制在 1000 平方英尺</li>
          </ul>
          <p className={styles.trapBody}>
            → <strong>同一个州,ADU 最大允许面积可以差 50%</strong>
          </p>
          <p className={styles.trapBody}>
            如果开发商不研究目标 City 的具体 ADU 规定就贸然下手,可能会出现"以为可以建 1200 尺、实际只批 800 尺"的尴尬。
          </p>

          <h3 className={styles.trapSubtitle}>例 2:洛杉矶市 ED1 政策——加州独此一家的开发红利</h3>
          <p className={styles.trapBody}>
            2022 年 12 月,时任洛杉矶市长 Karen Bass 上任后立刻签署了{' '}
            <strong>Executive Directive 1(ED1,第一号行政命令)</strong>——这是她为了应对洛杉矶住房危机而推出的、目前美国大城市中
            <strong>最激进的住房加速政策</strong>。
          </p>
          <p className={styles.trapBody}>
            <strong>ED1 的核心激励</strong>(针对 100% Affordable Housing 全保障性住房项目):
          </p>
          <div className={styles.tableScroller}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>维度</th>
                  <th>ED1 政策设定</th>
                  <th>实际执行</th>
                  <th>加州普通项目对比</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>审批速度</strong></td>
                  <td>政策目标:60 天内完成 Pre-construction Review</td>
                  <td>
                    <strong>实际平均 4-6 个月走完 Entitlement,被批准项目平均处理时间约 22 天</strong>(数据来源:Los Angeles Times / The Real Deal 2025-12 报道,截至 2025 年 11 月,共 490 个 ED1 项目走完流程,437 个获批)
                  </td>
                  <td>普通多家庭住宅项目 12-18 个月,复杂项目 2-3 年</td>
                </tr>
                <tr>
                  <td><strong>环评豁免</strong></td>
                  <td>100% Affordable 项目豁免 CEQA 自由裁量审查</td>
                  <td>实际落地,但近期出现政策回调争议</td>
                  <td>普通项目需做 EIR / CEQA Review</td>
                </tr>
                <tr>
                  <td><strong>密度奖励</strong></td>
                  <td>可叠加 State Density Bonus Law,密度可大幅突破基础 Zoning</td>
                  <td>实际激励数量上限被 2023-2024 年修订收紧(最多 5 项 incentives + 1 项 waiver)</td>
                  <td>严格按 Zoning</td>
                </tr>
                <tr>
                  <td><strong>停车位要求</strong></td>
                  <td>大幅降低,最低可至 0 个停车位</td>
                  <td>实际落地,多数项目零停车位</td>
                  <td>按 Zoning 配建(通常 1-2 个/单元)</td>
                </tr>
                <tr>
                  <td><strong>听证程序</strong></td>
                  <td>豁免 Discretionary Review 和邻居听证</td>
                  <td>实际落地,但 Single-family Zones 已被 2023 修订排除在 ED1 之外</td>
                  <td>多数项目需要听证</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className={styles.trapBody}>
            <strong>ED1 的核心约束(必须严格满足)</strong>:
          </p>
          <ul className={styles.warnList}>
            <li>
              必须是 <strong>100% Affordable</strong>——所有单元租金不超过 AMI(Area Median Income)的 80%,或采用混合模式(最多 20% 单元达 120% AMI,其余 ≤ 80% AMI)
            </li>
            <li>项目至少 <strong>5 个单元</strong></li>
            <li>
              <strong>仅适用于洛杉矶市辖区内</strong>——不适用于洛杉矶县其他城市(如比佛利山、圣莫尼卡等独立城市)
            </li>
            <li>
              2024 年的最新修订中,<strong>单户住宅区(Single-family Zones)已被排除在 ED1 通道之外</strong>
            </li>
            <li>
              <strong>不能拆 LARSO 保护的租金管制楼</strong>(12 单元以上的 LARSO 楼已被排除)
            </li>
            <li>ADU 在 ED1 项目内须做产权约束(deed-restricted affordable)</li>
            <li>
              2025 年 12 月,洛杉矶市议会一致通过将 ED1 永久化(Affordable Housing Streamlining Ordinance),政策稳定性增强
            </li>
          </ul>

          <h3 className={styles.trapSubtitle}>关键洞察</h3>
          <p className={styles.trapBody}>
            如果你是想在洛杉矶做开发的中国资本,
            <strong>ED1 是目前最值得研究的政策红利之一</strong>——但它有严格的边界。
          </p>
          <p className={styles.trapBody}>ED1 的核心特征可以总结为四点:</p>
          <ol className={styles.trapNumberList}>
            <li>
              <strong>审批时间从 12-18 个月压缩到 4-6 个月</strong>(接近但不等于中国速度,且已开工后 Permit 流程依然要走)
            </li>
            <li>
              <strong>停车位要求可以做到 0 个</strong>(在洛杉矶这种地价高的地方,节省的成本极其可观)
            </li>
            <li><strong>不需要邻居听证签字</strong>(避免邻避运动)</li>
            <li>
              <strong>可叠加 State Density Bonus</strong>,密度可大幅突破基础 Zoning(但激励项不超过 5 个 + 1 个 waiver)
            </li>
          </ol>
          <p className={styles.trapBody}>
            这四点本来是中国开发商在中国享受的"特权",
            <strong>在洛杉矶市内,只要做 100% 保障性住房,可以合法获得</strong>。
          </p>
          <p className={styles.trapBody}>
            但前提是——<strong>你必须严格按 ED1 规则做项目,不能挂着 ED1 的牌子搞商品房</strong>。
          </p>

          <div className={styles.trapCallout}>
            <span className={styles.calloutLabel}>⚠ 重要提醒</span>
            <p>
              ED1 政策<strong>自 2022 年 12 月推出以来已经修订了 3-4 次</strong>(2023 年加入 Single-family Zones 排除条款,2024 年加入 LARSO 保护条款,2025 年永久化)。这意味着
              <strong>今天合规的项目,明天政策一变可能就需要重新评估</strong>。中国开发商如果按"政策稳定不变"做财务模型,会踩坑。
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          陷阱 4
          ============================================================ */}
      <section className={styles.trap} id="trap-04">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 04 / 10</p>
            <h2 className={styles.trapTitle}>
              错误的产品定位——同一块地,选错了产品就输了
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>一个被严重低估的决策</h3>
          <p className={styles.trapBody}>
            中国开发商习惯了一套思路:拿地之后,看市场、看竞品、看利润率,决定建什么——别墅还是高层、大户型还是小户型、住宅还是商业。
            <strong>这是市场决策。</strong>
          </p>
          <p className={styles.trapBody}>
            但在美国,<strong>产品定位首先是审批路径决策,其次才是市场决策</strong>。
          </p>
          <p className={styles.trapBody}>
            选错了产品类型,不是少赚一点的问题——是审批多花 5 年、施工多花 30%、最后可能根本卖不出去的问题。
          </p>

          <h3 className={styles.trapSubtitle}>真实案例:4 个独立屋 vs 1 栋 Condo</h3>
          <p className={styles.trapBody}>接续陷阱 2 那位朋友的故事——</p>
          <p className={styles.trapBody}>
            他 2019 年花 70 多万买的旧 House,地块条件本身没问题。他的决策是"拆掉建 4 个独立 House"。
          </p>
          <p className={styles.trapBody}>
            听上去逻辑很顺:4 个独立屋 = 4 个独立产权 = 4 户买家 = 总价更高 = 利润更大。这是中国开发商的本能算法。
          </p>
          <p className={styles.trapBody}>
            <strong>但他忽略了 4 件事</strong>:
          </p>

          <h3 className={styles.trapSubtitleSmall}>一、审批路径完全不同</h3>
          <div className={styles.tableScroller}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>维度</th>
                  <th>4 个独立 House</th>
                  <th>1 栋 Condo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>是否需要 Subdivision(地块划分)</td>
                  <td>✓ 需要</td>
                  <td>✕ 不需要(产权通过 CC&amp;R + HOA 分)</td>
                </tr>
                <tr>
                  <td>是否需要 Public Hearing</td>
                  <td>✓ 通常需要</td>
                  <td>✕ 通常不需要</td>
                </tr>
                <tr>
                  <td>是否需要 Discretionary Review</td>
                  <td>✓ 是</td>
                  <td>✕ 多数情况下 Ministerial Approval</td>
                </tr>
                <tr>
                  <td>邻居能否反对</td>
                  <td>✓ 可以,且邻居反对常常推迟 1-2 年</td>
                  <td>✕ 邻居基本无权干涉</td>
                </tr>
                <tr>
                  <td><strong>预期审批周期</strong></td>
                  <td><strong>3-6 年(含听证、可能的诉讼)</strong></td>
                  <td><strong>9-15 个月</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.trapBody}>
            他选了 4 个独立屋——结果<strong>手续办了 6 年(2019 → 2025)</strong>。
          </p>
          <p className={styles.trapBody}>
            如果当初选 Condo——<strong>1 年到 1 年半</strong>就能开工。
          </p>

          <h3 className={styles.trapSubtitleSmall}>二、施工成本完全不同</h3>
          <p className={styles.trapBody}>
            4 个独立屋按 Subdivision 完成后,每栋之间的产权间距要求很严。
          </p>
          <p className={styles.trapBody}>
            他这个项目最后 <strong>4 栋楼之间只有 20 公分(约 8 英寸)</strong>。
          </p>
          <p className={styles.trapBody}>
            <strong>这个间距意味着什么?</strong>——施工架(Scaffolding)
            <strong>根本搭不进去</strong>。常规的外墙施工、保温、防水、外饰面工艺,全部失效。
          </p>
          <p className={styles.trapBody}>
            最后施工队想出来的方案:<strong>先把整面外墙在地上平放、做完所有施工,再用吊车整面竖起来</strong>(类似预制墙板工艺)。
          </p>
          <p className={styles.trapBody}>问题解决了——但施工成本暴涨:</p>
          <ul className={styles.trapList}>
            <li>多了一道墙体整体起吊工序(吊车 + 起重资质 + 保险)</li>
            <li>工期延长(每面墙都要做工厂级精度,不能现场调整)</li>
            <li>起吊保险费用单独算(吊装作业是高风险险种)</li>
            <li>施工许可的某些项目需要重新走(涉及非常规工法)</li>
          </ul>
          <p className={styles.trapBody}>
            <strong>保守估算,这部分额外成本至少占总建造预算的 8-15%。</strong>
          </p>

          <h3 className={styles.trapSubtitleSmall}>三、销售周期完全不同</h3>
          <p className={styles.trapBody}>
            独立屋虽然单价高,但<strong>目标买家更窄</strong>(要全款或自住贷款),且需要逐栋销售。
            <strong>Condo 可以预售,可以面向投资客(贷款更容易),销售周期通常缩短 30-50%。</strong>
          </p>

          <h3 className={styles.trapSubtitleSmall}>四、未来翻修/出售的灵活性完全不同</h3>
          <p className={styles.trapBody}>
            4 个独立屋——每栋的命运是独立的,其中一栋出问题(产权、贷款、买家违约)不影响其他栋,但
            <strong>也不能合并、不能整体出售给基金</strong>。
          </p>
          <p className={styles.trapBody}>
            Condo——可以整栋作为 Multifamily 卖给 REIT 或基金,可以做 1031 Exchange(见陷阱 9)合理避税。
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训</h3>
          <ul className={styles.trapTips}>
            <li>
              <strong>拿地之前,先问"用什么产品类型审批最顺、施工最易、退出最灵活"</strong>
            </li>
            <li>
              <strong>在加州,Condo 在大多数情况下比 detached houses 审批快 3-5 倍</strong>
            </li>
            <li>
              <strong>聘请 Land Use Attorney + 有经验的 Architect 做"Product Feasibility Study"</strong>
              (产品可行性研究),花 1-2 万美金,省下 2-3 年时间和数十万美金额外成本
            </li>
            <li>
              <strong>不要被"独立屋单价高"的本能算法迷惑——美国房地产的利润,往往不在销售单价,而在审批路径、资金周转、退出灵活性</strong>
            </li>
          </ul>
        </div>
      </section>

      {/* ============================================================
          陷阱 5
          ============================================================ */}
      <section className={styles.trap} id="trap-05">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 05 / 10</p>
            <h2 className={styles.trapTitle}>
              成本误判——以为中国制造能碾压美国,结果死在关税上
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>一个看似诱人的算盘</h3>
          <p className={styles.trapBody}>
            很多中国开发商进入美国后,第一反应是:
            <strong>"美国建材这么贵?我从中国进,能赚翻!"</strong>
          </p>
          <p className={styles.trapBody}>举个真实数据对比——</p>
          <p className={styles.trapBody}>
            <strong>某款标准复合木地板:</strong>
          </p>
          <ul className={styles.trapList}>
            <li><strong>美国本土零售价</strong>:约 <strong>$7/平方英尺</strong></li>
            <li>
              <strong>中国工厂出厂价</strong>:约 <strong>¥2/平方英尺</strong>(折合约{' '}
              <strong>$0.30/平方英尺</strong>)
            </li>
          </ul>
          <p className={styles.trapBody}>
            差价 20 多倍。看到这个数字,几乎每个中国开发商都会兴奋——这不是稳赚不赔的生意?
          </p>
          <p className={styles.trapBody}>
            <strong>但这是典型的"看表不看里"。</strong>{' '}
            实际算账,必须加上 6 道成本。
          </p>

          <h3 className={styles.trapSubtitle}>真实成本拆解</h3>
          <div className={styles.tableScroller}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>成本项</th>
                  <th>金额(按 $0.30/sqft 出厂价 + 当前关税环境估算)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>出厂价</td><td>$0.30</td></tr>
                <tr><td>内陆运输(工厂→中国港口)</td><td>~$0.05</td></tr>
                <tr><td>装柜 + 港口费 + 报关</td><td>~$0.10</td></tr>
                <tr><td><strong>海运 + 保险</strong></td><td>~$0.15-0.25(看船期和港口)</td></tr>
                <tr><td>美国港口卸货 + 仓储 + 内陆运到仓库</td><td>~$0.15-0.20</td></tr>
                <tr><td><strong>美国进口关税(核心成本!)</strong></td><td>⚠ <strong>见下文</strong></td></tr>
                <tr><td>美国仓储 + 销售管理费</td><td>~$0.20-0.30</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className={styles.trapSubtitle}>关税才是真正的杀手</h3>
          <p className={styles.trapBody}>
            以中国产复合木地板和瓷砖类建材为例,目前进入美国通常需要承担
            <strong>多重叠加关税</strong>:
          </p>
          <ol className={styles.trapNumberList}>
            <li><strong>基础进口关税(MFN,最惠国关税)</strong>:通常 3-8%</li>
            <li><strong>反倾销税(Anti-dumping Duty, AD)</strong>:中国木制品、橱柜、瓷砖等品类税率最高可达 <strong>200%+</strong></li>
            <li><strong>反补贴税(Countervailing Duty, CVD)</strong>:通常额外加 30-100%+</li>
            <li><strong>特朗普政府 232/301 特别关税</strong>:根据品类不同 7.5%-25%+</li>
            <li><strong>2025-2026 年加征的"中国对等关税"</strong>:根据品类再叠加</li>
          </ol>
          <p className={styles.trapBody}>
            <strong>综合下来,部分品类中国建材到美国的实际综合关税可以达到 100%-380%+</strong>。
          </p>
          <p className={styles.trapBody}>
            这意味着——<strong>$0.30/sqft 的中国地板,进到美国仓库的"全成本价",可能高达 $4-7/sqft</strong>,
            <strong>和美国本土批发价基本持平,甚至更贵</strong>。
          </p>
          <p className={styles.trapBody}>
            <strong>"中国制造碾压全世界"的幻觉,在美国房地产建材领域已经基本破产</strong>。
          </p>

          <h3 className={styles.trapSubtitle}>转口逃税:一条看起来很美的死路</h3>
          <p className={styles.trapBody}>
            很多中国老板和华人商家想出"绕道东南亚"的招数——
            <strong>把中国货发到马来西亚、越南、印尼,换个包装、改个产地标签,再发到美国,享受东南亚的低关税</strong>。
          </p>
          <p className={styles.trapBody}>
            <strong>这在美国法律上叫"Transshipment(转运/转口)规避关税",是明确的联邦犯罪。</strong>
          </p>

          <h3 className={styles.trapSubtitleSmall}>
            真实案例:旧金山 Uni-Tile &amp; Marble 案(2025 年 12 月起诉)
          </h3>
          <p className={styles.trapBody}>
            <strong>2025 年 12 月</strong>,美国司法部北加州联邦地区检察官办公室对三名旧金山湾区华人商人和三家公司提起联邦起诉。
            <strong>截至本文发稿时,此案仍处于司法程序中,起诉书所列指控尚未经法庭审判最终认定,所有被告依法享有无罪推定。以下内容仅为对公开起诉文书的转述:</strong>
          </p>
          <p className={styles.trapBody}><strong>被起诉人</strong>:</p>
          <ul className={styles.trapList}>
            <li><strong>Henry Pan(潘新棉)</strong>,63 岁,旧金山</li>
            <li><strong>Nolan Xie(谢华良)</strong>,61 岁,南旧金山</li>
            <li><strong>Johnson Wang(王金华)</strong>,53 岁,中国籍</li>
          </ul>
          <p className={styles.trapBody}><strong>被起诉公司</strong>:</p>
          <ul className={styles.trapList}>
            <li><strong>Uni-Tile &amp; Marble Inc.</strong>(湾区)</li>
            <li><strong>Uni-Stone &amp; Cabinet Inc.</strong>(湾区)</li>
            <li><strong>深圳 Top &amp; Profit International Forwarding Co. Ltd</strong>(中国物流公司)</li>
          </ul>
          <p className={styles.trapBody}><strong>指控罪名</strong>:</p>
          <ul className={styles.trapList}>
            <li>共谋(Conspiracy)</li>
            <li>共谋电信欺诈(Wire Fraud Conspiracy)</li>
            <li>电信欺诈(Wire Fraud)</li>
            <li>走私(Smuggling)</li>
            <li>向海关作虚假陈述(Entry of Goods by Means of False Statements)</li>
            <li>国际洗钱(International Money Laundering)</li>
          </ul>
          <p className={styles.trapBody}>
            <strong>指控的具体手法</strong>:将中国生产的
            <strong>石英台面(Quartz Surface Products)、木橱柜(Wooden Cabinets &amp; Vanities)、瓷砖(Ceramic Tiles)</strong>——这些恰好都是被加征
            <strong>反倾销税 + 反补贴税</strong>的品类——发到<strong>马来西亚</strong>,再从马来西亚港口出口到
            <strong>奥克兰港</strong>,<strong>向美国海关(CBP)谎报"原产地:马来西亚"</strong>。
          </p>
          <p className={styles.trapBody}>
            每项罪名的最高刑期可达 <strong>20 年监禁</strong>(具体判决以法庭裁定为准)。涉案公司面临的民事 + 刑事罚款金额,根据 DOJ 公开声明可能超过涉案货值的数倍。
          </p>

          <h3 className={styles.trapSubtitleSmall}>
            "Substantial Transformation" 才是合法的路径
          </h3>
          <p className={styles.trapBody}>
            美国海关对"原产地"有明确的法律概念——
            <strong>Substantial Transformation(实质性改造)</strong>。但要特别注意:
            <strong>是否构成"实质性改造"没有一个固定的百分比公式</strong>,而是由 CBP(美国海关与边境保护局)根据具体产品的 HTS 编码、生产工艺、加工深度,结合既往 CBP ruling(海关裁定)逐案判定。
          </p>
          <ul className={styles.trapTips}>
            <li>
              <strong>合法方向</strong>:原材料主要在东南亚本地采购、核心制造工艺在东南亚真实完成、当地有真实的工厂/工人/生产记录,使产品发生实质性改变 → 在符合 CBP 判定标准的前提下,可标注东南亚原产
            </li>
          </ul>
          <ul className={styles.crossList}>
            <li>
              <strong>非法</strong>:中国造的成品到东南亚换标签 + 中国造的半成品到东南亚简单组装 + 用东南亚壳公司开发票 → 全部属于 Transshipment Fraud
            </li>
          </ul>
          <div className={styles.trapCallout}>
            <span className={styles.calloutLabel}>关键提醒</span>
            <p>
              原产地认定是高度专业的法律问题。任何涉及东南亚供应链的安排,
              <strong>必须由有经验的海关律师或持牌报关行(customs broker)根据具体产品逐案评估</strong>,不能自己拍脑袋判断。
            </p>
          </div>

          <h3 className={styles.trapSubtitleSmall}>教训</h3>
          <ul className={styles.trapTips}>
            <li>
              <strong>进入美国市场,财务模型必须用"全成本到美国仓库的真实价格"算账</strong>,不要用中国出厂价幻想
            </li>
            <li>
              <strong>关税不是可以"绕"的,是必须接受的成本</strong>——能在这个成本下还有利润的项目,才是真正的好项目
            </li>
            <li>
              <strong>真要用东南亚供应链,必须做合法的供应链转移</strong>——这不是几个月的事,是 2-3 年的产业搬迁
            </li>
            <li>
              <strong>管理能力 + 设计创新 + 工艺优化,才是降低成本的合法路径</strong>。这些是能力的体现,不是违法的捷径
            </li>
          </ul>

          <h3 className={styles.trapSubtitleSmall}>一个更深的启示</h3>
          <p className={styles.trapBody}>
            <strong>按美国规则算账还能赚钱的项目,才是好项目。</strong>
          </p>
          <p className={styles.trapBody}>
            如果一个项目必须"绕关税""逃税"才能盈利——这个项目本身就不该做。
          </p>
          <p className={styles.trapBody}>
            中国开发商常常被这种"擦边球能赚翻"的诱惑带进沟里。真正成熟的玩家,
            <strong>只做"按规则也能赚"的项目</strong>。能通过运营、设计、管理把成本压下来,是 alpha;通过违法把成本压下来,是定时炸弹。
          </p>
        </div>
      </section>

      <PullQuote
        text="按美国规则算账还能赚钱的项目,才是好项目。"
        attribution="SAREC RESEARCH"
      />

      <MidArticleCTA
        body="如果你正在考虑或已经开始进入美国房地产开发市场,SAREC 可以提供一次免费 30 分钟咨询——评估你的项目,看是否值得继续推进。"
        ctaLabel="预约免费 30 分钟咨询"
        ctaHref="mailto:info@sinoamericanrec.org"
      />

      {/* Asset 待定 #2:中段视觉休息 */}
      <section className={styles.assetPlaceholder} aria-label="中段视觉休息占位">
        <p className={styles.assetPlaceholderText}>
          ASSET 待定
          <strong>中段视觉休息点 · 占位</strong>
        </p>
      </section>

      {/* ============================================================
          陷阱 6
          ============================================================ */}
      <section className={styles.trap} id="trap-06">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 06 / 10</p>
            <h2 className={styles.trapTitle}>
              误把 EB-5 当稳定资金来源
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>中国开发商的常见误判</h3>
          <p className={styles.trapBody}>
            EB-5 投资移民项目听起来像是开发商的天堂。它的基本流程是:投资者投入规定金额(目标就业区 TEA 项目约 80 万美元,普通项目约 105 万美元) + 项目创造至少 10 个全职就业岗位 → 提交{' '}
            <strong>I-526E 移民申请(petition,这是一份申请,不是绿卡本身)</strong> → 获批后,再经领馆程序或境内身份调整(I-485)→ 取得{' '}
            <strong>2 年期的条件性绿卡(conditional green card)</strong> → 2 年期满前提交{' '}
            <strong>I-829</strong> 申请解除条件 → 获得正式(无条件)绿卡。
          </p>
          <p className={styles.trapBody}>从开发商角度看,EB-5 资金似乎很美:</p>
          <ul className={styles.trapList}>
            <li><strong>资金成本低</strong>(年化 0.5%-2%,远低于银行贷款)</li>
            <li><strong>不需要还本</strong>(5-7 年项目结束时归还本金即可)</li>
            <li><strong>不需要个人担保</strong></li>
            <li><strong>来源稳定</strong>(中国高净值家庭对美国绿卡的需求长期存在)</li>
          </ul>
          <p className={styles.trapBody}>
            很多中国开发商把 EB-5 当作{' '}
            <strong>"低成本+稳定+无担保"</strong> 的核心资金来源。
          </p>
          <p className={styles.trapBody}>
            <strong>这是巨大的认知错误。</strong>
          </p>

          <h3 className={styles.trapSubtitle}>EB-5 的真实风险结构</h3>
          <p className={styles.trapBody}>
            EB-5 资金看起来稳定,实际上是
            <strong>整个房地产资金链中最不稳定的部分</strong>。原因:
          </p>

          <h3 className={styles.trapSubtitleSmall}>风险 1:EB-5 投资人的核心目标不是收益,是绿卡</h3>
          <p className={styles.trapBody}>
            这决定了——<strong>一旦项目进度延误、工作岗位数量不达标、I-526E 申请被 USCIS 拒绝,EB-5 投资人会立刻发起集体诉讼,要求退还本金</strong>。
          </p>
          <p className={styles.trapBody}>
            <strong>他们不在乎项目能不能继续,他们在乎自己的绿卡。</strong>
          </p>

          <h3 className={styles.trapSubtitleSmall}>风险 2:EB-5 资金的退出有"硬期限"</h3>
          <p className={styles.trapBody}>
            普通银行贷款是"展期机制"——市场不好可以谈延期、谈重组。
            <strong>EB-5 资金不行</strong>——投资人 5 年到期等绿卡,时间窗口固定。
          </p>
          <p className={styles.trapBody}>
            如果项目延期,5-7 年后 EB-5 投资人要求退还本金,开发商必须拿出真金白银。
            <strong>这往往就是引发挤兑、引发崩盘的导火索</strong>。
          </p>

          <h3 className={styles.trapSubtitleSmall}>风险 3:项目失败 → 集体诉讼 → 母公司连锁</h3>
          <p className={styles.trapBody}>
            <strong>泛海洛杉矶项目就是教科书级的案例</strong>——
          </p>
          <p className={styles.trapBody}>
            根据 The Real Deal 2023 年 6 月报道,
            <strong>EB-5 投资人通过 L.A. Downtown Investment 有限合伙公司</strong>对泛海发出违约通知,指控:
          </p>
          <ul className={styles.trapList}>
            <li>泛海未能按贷款协议完成施工</li>
            <li>泛海未能获得 Senior Construction Loan</li>
            <li>项目被挂上多项 Mechanic&rsquo;s Lien(违反贷款协议)</li>
            <li>未维持全险保险(All Risk Insurance)</li>
            <li>
              <strong>拖欠至少 1,180 万美元利息 + 5,600 万美元本金</strong>
            </li>
          </ul>
          <p className={styles.trapBody}>
            EB-5 投资人不只是债权人——他们同时是
            <strong>面临 I-526E 移民身份风险的家庭</strong>。当项目崩盘时,他们的反应是
            <strong>所有渠道同时启动</strong>:联邦法院民事诉讼 + USCIS 投诉 + 媒体曝光 + 政治施压。
          </p>
          <p className={styles.trapBody}>
            <strong>对开发商而言,这是最难处理的危机——因为对手不是商业谈判对手,是 fighting for their family&rsquo;s future。</strong>
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训</h3>
          <ul className={styles.trapTips}>
            <li>
              <strong>EB-5 资金可以用,但不能作为"主轴资金"</strong>——它应该是 capital stack(资金堆栈)中 10-20% 的补充,不是 60-80% 的核心
            </li>
            <li>
              <strong>必须有 Senior Construction Loan 作为主轴融资</strong>——这是 EB-5 不能替代的
            </li>
            <li>
              <strong>EB-5 项目必须聘请有 USCIS 经验的移民律师 + 证券律师双重把关</strong>——尤其是 PPM(私募备忘录)和 Subscription Agreement
            </li>
            <li>
              <strong>项目进度必须严格按 Job Creation Schedule 跑</strong>——这直接关系到 EB-5 投资人的 I-526E 批准率
            </li>
            <li>
              <strong>不要把 EB-5 投资人当成"沉默的钱"——他们是最积极的债权人</strong>
            </li>
          </ul>
        </div>
      </section>

      {/* ============================================================
          陷阱 7
          ============================================================ */}
      <section className={styles.trap} id="trap-07">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 07 / 10</p>
            <h2 className={styles.trapTitle}>
              忽视 Mechanic&rsquo;s Lien 的杀伤力
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>一个让中国开发商措手不及的法律武器</h3>
          <p className={styles.trapBody}>
            Mechanic&rsquo;s Lien(机械师留置权,又译"工程留置权")是美国房地产领域
            <strong>最强的债权人保护工具之一</strong>,但在中国房地产行业
            <strong>完全没有对应概念</strong>。
          </p>
          <p className={styles.trapBody}><strong>简单解释</strong>:</p>
          <ul className={styles.trapList}>
            <li>在美国,任何为项目提供过劳务或材料的人(包括总包、分包、供应商、甚至个体工人)——</li>
            <li>如果开发商拖欠工程款,</li>
            <li><strong>他可以单方面在县记录处(County Recorder&rsquo;s Office)提交一份 Mechanic&rsquo;s Lien</strong></li>
            <li><strong>这个 Lien 立刻成为项目的法定债务,附着在土地和建筑物上</strong></li>
            <li><strong>直到 Lien 被清偿,项目不能转让、不能再融资、不能交付</strong></li>
          </ul>

          <h3 className={styles.trapSubtitle}>致命之处</h3>

          <h3 className={styles.trapSubtitleSmall}>一、单方申请,门槛极低</h3>
          <p className={styles.trapBody}>
            不需要法院裁定,不需要开发商同意——
            <strong>分包商觉得你欠他钱,就能挂 Lien</strong>。
          </p>
          <p className={styles.trapBody}>
            虽然开发商可以反诉"虚假 Lien",但反诉本身需要数月到数年时间,
            <strong>期间 Lien 一直挂在项目上</strong>。
          </p>

          <h3 className={styles.trapSubtitleSmall}>二、Title Insurance 必查 Lien</h3>
          <p className={styles.trapBody}>
            任何一笔交易、再融资、Permit 申请——
            <strong>Title Company 都必须检查项目是否有 Lien</strong>。一旦有,所有交易冻结。
          </p>

          <h3 className={styles.trapSubtitleSmall}>三、一个 Lien 引发连锁</h3>
          <p className={styles.trapBody}>
            第一个分包商挂 Lien 后,其他分包商立刻警觉——
            <strong>为了避免成为最后被偿付的,他们会立刻跟进挂 Lien</strong>。
          </p>
          <p className={styles.trapBody}>
            这就是为什么泛海洛杉矶项目{' '}
            <strong>6 家分包商在 1 个月内挂了 6,250 万美元 Lien</strong>——
            <strong>这是雪崩,不是个别行为</strong>。
          </p>

          <h3 className={styles.trapSubtitleSmall}>四、Lien 会触发贷款协议违约</h3>
          <p className={styles.trapBody}>
            绝大多数 Construction Loan 协议中都明确:
            <strong>"项目出现 Mechanic&rsquo;s Lien 即构成违约事件"</strong>。
          </p>
          <p className={styles.trapBody}>
            泛海项目的 EB-5 违约通知中专门提到——
            <strong>"允许 Mechanic&rsquo;s Lien 被挂在项目上,违反了贷款协议"</strong>。这是导致 EB-5 投资人发起追索的关键之一。
          </p>

          <h3 className={styles.trapSubtitle}>中国开发商的典型错误</h3>
          <p className={styles.trapBody}>
            中国开发商的本能是——<strong>工程款?先拖一拖,回头一起结</strong>。
          </p>
          <p className={styles.trapBody}>
            在中国——这是行业惯例,分包商不敢撕破脸。
          </p>
          <p className={styles.trapBody}>
            在美国——<strong>分包商第二天就来挂 Lien</strong>。
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训</h3>
          <ul className={styles.trapTips}>
            <li>
              <strong>进度款必须按合同节点准时支付</strong>——逾期 30 天就是 Lien 红线
            </li>
            <li>
              <strong>要求所有分包商签 Lien Waiver</strong>(Conditional Lien Release 和 Unconditional Lien Release)——每次付款时收一份
            </li>
            <li>
              <strong>设立 Construction Disbursement Account(建筑拨款账户)由第三方(Title Company 或 Disbursement Agent)管理</strong>——确保工程款专款专用
            </li>
            <li>
              <strong>Lien 一旦出现,不要拖延,立刻处理</strong>——通过支付、Lien Bond(留置权保证金)、或起诉 Lien 移除——拖延就是死亡
            </li>
          </ul>
        </div>
      </section>

      {/* ============================================================
          陷阱 8
          ============================================================ */}
      <section className={styles.trap} id="trap-08">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 08 / 10</p>
            <h2 className={styles.trapTitle}>
              走捷径行贿——五眼联盟的代价
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>一个中国开发商最容易低估的法律风险</h3>
          <p className={styles.trapBody}>
            中国房地产行业的运作中,"打点关系"是一种常见甚至必要的能力。给政府官员送礼、安排吃饭、提供方便——这是"行业潜规则"。
          </p>
          <p className={styles.trapBody}>
            很多中国开发商进入美国后,
            <strong>本能地试图用同样的方式打开局面</strong>——加快审批、争取容积率、协调反对意见。
          </p>
          <p className={styles.trapBody}>
            <strong>这是最致命的赌博。</strong> 在美国,这叫{' '}
            <strong>Bribery of a Public Official(贿赂公职人员)</strong>,是联邦重罪。
          </p>

          <h3 className={styles.trapSubtitle}>真实案例:富力地产张力案</h3>
          <p className={styles.trapBody}>
            <strong>张力是谁</strong>:广州富力地产联合创始人、联席董事长。曾任广州市政府官员,1993 年下海,1994 年与香港富商李思廉创办富力地产,曾为中国房地产销售前 10 强企业。
          </p>
          <p className={styles.trapBody}>
            <strong>事件经过</strong>(均为公开报道事实,来源包括彭博社、南华早报、SF Standard、Mingtiandi、SCMP 等):
          </p>
          <div className={styles.tableScroller}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>事件</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2014-2015 年</td>
                  <td>张力个人控股的加州公司 <strong>Z&amp;L Properties Inc.</strong>(与上市公司富力地产无股权关系)启动旧金山 <strong>555 Fulton Street</strong> 住宅+商业综合开发项目</td>
                </tr>
                <tr>
                  <td>2018 年</td>
                  <td>旧金山公共工程局(Department of Public Works)局长 <strong>Mohammed Nuru</strong> 应邀访问中国,张力为其支付五星级酒店住宿,在张力私宅接待时赠送约 <strong>$2,070 美元</strong> 的酒以及一些可疑钻石原石。Nuru 未按美国法律要求申报这些礼物</td>
                </tr>
                <tr>
                  <td>2020 年 1 月</td>
                  <td>FBI 对 Mohammed Nuru 启动调查,逮捕 Nuru</td>
                </tr>
                <tr>
                  <td>2021 年 12 月 17 日</td>
                  <td>美国司法部在网站公布对张力的起诉书(起诉书中行贿者标识为 "Developer 1",后经多方媒体报道确认为张力)</td>
                </tr>
                <tr>
                  <td><strong>2022 年 11 月 30 日</strong></td>
                  <td>张力<strong>在英国伦敦希思罗机场被英国警方逮捕</strong>,当时他从新加坡乘飞机抵达。<strong>被捕原因是美国向英国提出引渡请求</strong>(基于美英引渡条约),<strong>不是国际通缉,而是美国请求引渡的法律执行</strong></td>
                </tr>
                <tr>
                  <td>2022 年 12 月 12 日</td>
                  <td>张力以 <strong>1,500 万英镑</strong> 保释金获保释(约合 1840 万美元,是英国法院历史上最高保释金之一)</td>
                </tr>
                <tr>
                  <td>保释期间</td>
                  <td>张力被监视居住于伦敦塔桥附近一处与富力地产关联的公寓 43 层,由前军事人员每 12 小时轮班看守,禁用任何上网设备</td>
                </tr>
                <tr>
                  <td>2023 年 6 月</td>
                  <td>张力同意接受引渡(撤回此前的抗辩)</td>
                </tr>
                <tr>
                  <td>2023 年 7 月</td>
                  <td>张力被引渡至美国旧金山</td>
                </tr>
                <tr>
                  <td>2023 年 7 月</td>
                  <td>张力与美国检察官达成 <strong>DPA(Deferred Prosecution Agreement,延期起诉协议)</strong>——3 年后撤销针对本人的指控(须履行所有协议条件)。<strong>返回中国</strong></td>
                </tr>
                <tr>
                  <td>2023 年 8 月</td>
                  <td>Mohammed Nuru 因 honest services wire fraud(诚信服务电信欺诈)被判 <strong>7 年监禁</strong></td>
                </tr>
                <tr>
                  <td>2023 年 10 月</td>
                  <td>张力旗下 <strong>Z&amp;L Properties Inc.</strong> 公司认罪(共谋欺诈),被罚款 <strong>100 万美元</strong>,并须建立企业合规计划</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className={styles.trapSubtitle}>这个案例的 4 个核心教训</h3>

          <h3 className={styles.trapSubtitleSmall}>教训 1:美国司法的"长臂管辖"远超想象</h3>
          <p className={styles.trapBody}>
            行贿行为发生在<strong>中国</strong>(在中国宴请美国官员、在中国私宅赠送礼物),但美国仍然有管辖权——因为对方是
            <strong>美国公职人员</strong>,且行贿动机是为了<strong>在美国的项目利益</strong>。
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训 2:美国通过引渡条约的全球追索能力</h3>
          <p className={styles.trapBody}>
            很多人误以为张力是被"国际通缉"——<strong>这是不准确的</strong>。
          </p>
          <p className={styles.trapBody}>
            准确情况是:<strong>美国大陪审团起诉张力后,美国向英国提出了引渡请求。当张力 2022 年 11 月从新加坡飞抵伦敦希思罗机场时,英国警方根据美英引渡条约和美国的引渡请求将其逮捕。</strong>
          </p>
          <p className={styles.trapBody}>
            这是 <strong>bilateral extradition(双边引渡)</strong> 的执行,不是 Interpol 国际通缉。
          </p>
          <p className={styles.trapBody}>但效果是一样的——</p>
          <p className={styles.trapBody}>
            <strong>美国与全球 100+ 个国家有引渡条约</strong>,包括:
          </p>
          <ul className={styles.trapList}>
            <li><strong>五眼联盟</strong>:英国、加拿大、澳大利亚、新西兰(最紧密的引渡合作)</li>
            <li><strong>欧盟主要国家</strong>:德国、法国、意大利、西班牙、荷兰等</li>
            <li><strong>亚洲</strong>:日本、韩国、菲律宾</li>
            <li><strong>美洲</strong>:墨西哥、巴西、阿根廷</li>
          </ul>
          <p className={styles.trapBody}>
            只要美国对某人提起诉讼并发出引渡请求,
            <strong>这个人在上述任何一个国家落地,都可能被当地警方根据引渡条约逮捕</strong>。
          </p>
          <p className={styles.trapBody}>
            张力的最大失误是——以为"不进入美国"就安全。事实上
            <strong>任何与美国有引渡条约的国家都是风险区</strong>。
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训 3:行贿金额低,不等于事情小</h3>
          <p className={styles.trapBody}>
            张力涉案的直接行贿金额(含酒、礼物估值约 $2,000+ 加上酒店住宿等),美国检方初步估算的相关价值不超过几万美元。但导致的实际后果是:
          </p>
          <ul className={styles.trapList}>
            <li>被美国大陪审团起诉</li>
            <li>在伦敦机场被捕</li>
            <li>保释金 1,500 万英镑(约合 1.4 亿元人民币)</li>
            <li>在伦敦监视居住 7 个月</li>
            <li>引渡至美国,4 天羁押</li>
            <li>Z&amp;L Properties 公司被罚 100 万美元</li>
            <li>美国法律费用(保守估计数百万美元)</li>
            <li>富力地产股价当日深跌 14%</li>
            <li><strong>个人声誉永久受损</strong></li>
          </ul>
          <p className={styles.trapBody}>
            <strong>美国 FCPA(《反海外腐败法》)和相关反贿赂法律,对金额不敏感,对行为本身极敏感</strong>。$2,000 的酒,足以引发数百万美元的法律链条。
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训 4:DPA 也不是"赢"</h3>
          <p className={styles.trapBody}>
            张力最终通过 DPA 协议回到中国——表面看似"免于刑事处罚"。但 DPA 的实际条件是:
          </p>
          <ul className={styles.trapList}>
            <li><strong>承认相关行为</strong>(不是无罪释放)</li>
            <li><strong>3 年观察期</strong></li>
            <li><strong>配合美国司法系统的相关调查</strong></li>
            <li><strong>未来 3 年内若违反任何美国法律,DPA 自动失效,原起诉全部恢复</strong></li>
            <li><strong>公司缴纳 100 万美元罚款</strong></li>
            <li><strong>公司须建立企业合规计划</strong></li>
          </ul>
          <p className={styles.trapBody}>
            而被贿赂官员 Mohammed Nuru 的命运是——<strong>判处 7 年联邦监狱</strong>。两边的代价都不轻。
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训</h3>
          <ul className={styles.trapTips}>
            <li>
              <strong>进入美国市场前,必须接受美国合规培训(FCPA Compliance)</strong>——这是所有跨国公司的标配
            </li>
            <li>
              <strong>任何形式的"礼物""招待""费用支付""咨询费"给到美国公职人员或其家属,都可能构成行贿</strong>——金额无关大小
            </li>
            <li>
              <strong>不要相信"在中国做的事情美国管不到"</strong>——美国的长臂管辖是真实存在的
            </li>
            <li>
              <strong>不要相信"不进入美国就没事"</strong>——美国与全球 100+ 国家有引渡条约,五眼联盟是其中最紧密的一层。任何在这些国家的入境,都可能成为风险点
            </li>
            <li>
              <strong>如果项目审批遇到困难,正确的解决路径是聘请有政府关系的律师事务所和咨询公司(Lobbyist)</strong>——这是合法的,且通常更有效
            </li>
          </ul>
        </div>
      </section>

      {/* ============================================================
          陷阱 9
          ============================================================ */}
      <section className={styles.trap} id="trap-09">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 09 / 10</p>
            <h2 className={styles.trapTitle}>
              逃税而不是合理避税——错过 1031 Exchange 的几百万
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>中国开发商常见的两个极端</h3>
          <p className={styles.trapBody}>
            <strong>极端一</strong>:完全不研究美国税法 → 项目卖出后被税"扒一层皮",发现实际净利润比预期少 30-40%
          </p>
          <p className={styles.trapBody}>
            <strong>极端二</strong>:研究了税法但走偏 → 想通过虚增建安成本、虚列人工成本、阴阳合同等手段"逃税" → 被 IRS 抓到 → 巨额罚款 + 刑事责任
          </p>
          <p className={styles.trapBody}>
            <strong>真正聪明的做法是中间路径——合理避税(Tax Planning),而不是逃税(Tax Evasion)。</strong>
          </p>

          <h3 className={styles.trapSubtitle}>1031 Exchange:美国房地产投资重要的合法递延税工具</h3>
          <p className={styles.trapBody}>
            <strong>Internal Revenue Code Section 1031(美国国内税法第 1031 条款)</strong>——允许
            <strong>为生产经营或投资目的而持有的(held for productive use in a trade or business or for investment)</strong>
            房地产,在出售后将收益再投入同类(like-kind)房地产,
            <strong>递延(defer)</strong>资本利得税。
          </p>

          <div className={styles.trapCallout}>
            <span className={styles.calloutLabel}>⚠ 先说一个开发商最容易踩的认知盲区</span>
            <p>
              <strong>1031 不是对所有房地产都适用。</strong> 这一点中国开发商极易误解,必须讲清楚:
            </p>
            <p>
              根据税法第 1031(a)(2) 条,
              <strong>
                "为在正常经营过程中向客户转售而主要持有的财产(property held primarily for sale)"属于存货(inventory / stock in trade),不适用 1031
              </strong>
              。
            </p>
            <p>这意味着——</p>
          </div>
          <ul className={styles.crossList}>
            <li>
              一个<strong>盖了房子就卖</strong>的开发商(spec homes、分割地块出售),其待售房产很可能被 IRS 认定为{' '}
              <strong>dealer property / inventory(经销存货)</strong>,
              <strong>不能做 1031</strong>,而且出售利得按
              <strong>普通所得税率(ordinary income)</strong>征税,不是资本利得税率
            </li>
          </ul>
          <ul className={styles.trapTips}>
            <li>
              而<strong>长期持有用于出租或投资</strong>的房产(如自持的 multifamily、商业物业、出租公寓),才更可能符合"held for investment",有资格做 1031
            </li>
          </ul>
          <p className={styles.trapBody}>
            <strong>"是 dealer 还是 investor",由 IRS 根据持有意图、持有时长、开发与营销行为等事实逐案判定</strong>,没有一刀切的公式。开发商如果默认"我做开发就能滚 1031",是危险的误解。
          </p>

          <h3 className={styles.trapSubtitleSmall}>一个合规的举例(投资性持有场景)</h3>
          <p className={styles.trapBody}>
            假设你<strong>长期持有</strong>一处出租型投资物业,多年后出售:
          </p>
          <ul className={styles.trapList}>
            <li>原始成本基础:<strong>$500 万</strong></li>
            <li>出售价:<strong>$1,200 万</strong></li>
            <li>资本利得:约 <strong>$700 万</strong></li>
          </ul>
          <p className={styles.trapBody}>
            <strong>情景 A:不做 1031(直接缴税)</strong>
          </p>
          <ul className={styles.trapList}>
            <li>联邦长期资本利得税:约 <strong>20%</strong></li>
            <li>加州州税:最高约 <strong>13.3%</strong></li>
            <li>Net Investment Income Tax:约 <strong>3.8%</strong></li>
            <li>外加此前折旧的 <strong>Depreciation Recapture(折旧追回,税率最高 25%)</strong></li>
            <li><strong>综合税负可能达数十万至上百万美元量级</strong>(具体取决于折旧、持有结构、州税等)</li>
          </ul>
          <p className={styles.trapBody}>
            <strong>情景 B:做 1031 Exchange(符合条件时)</strong>
          </p>
          <ul className={styles.trapList}>
            <li>出售后 <strong>45 天内</strong> 书面识别(identify)替代物业(规则有数量/价值限制)</li>
            <li><strong>180 天内</strong> 完成置换交割(closing)</li>
            <li>必须通过 <strong>Qualified Intermediary(合格中介)</strong> 处理资金,出售款不能经你自己的手</li>
            <li>在满足全部条件的前提下,<strong>资本利得税可递延</strong>,资金可更完整地投入下一个项目</li>
          </ul>
          <p className={styles.trapBody}>
            <strong>注意:1031 是"递延(defer)",不是"免除(eliminate)"。</strong> 递延的税在未来处置时仍可能产生,除非通过后续规划处理。
          </p>

          <h3 className={styles.trapSubtitleSmall}>关于"递延 + Step-up in Basis"的长期规划</h3>
          <p className={styles.trapBody}>
            有一种长期策略是:
            <strong>通过连续合规的 1031 置换持续递延,持有至身故,由继承人通过 Step-up in Basis(继承时计税基础重置)</strong>{' '}
            调整资产的计税基础,从而<strong>在特定条件下降低或消除部分未实现资本利得的所得税影响</strong>。
          </p>
          <p className={styles.trapBody}>但必须强调:</p>
          <ul className={styles.trapList}>
            <li>
              这<strong>不等于"完全免税"</strong>——Step-up 只针对所得税层面的未实现增值,
              <strong>还需综合考虑联邦遗产税、赠与税、投资人的税务居民身份、州税规则,以及未来税法变化</strong>(1031 和 step-up 规则都曾多次被提议修改)
            </li>
            <li>
              对<strong>非美国税务居民、跨境持有结构</strong>,情况更复杂,不能简单套用美国本土投资人的逻辑
            </li>
            <li>
              这是一套需要<strong>跨境 CPA + 税务律师 + 遗产规划律师</strong>共同设计的方案,绝非"自己滚几个项目就免税"那么简单
            </li>
          </ul>

          <h3 className={styles.trapSubtitle}>1031 的核心规则(简版)</h3>
          <ul className={styles.trapTips}>
            <li>必须是<strong>为投资或生产经营持有</strong>的房地产(排除自住房、排除主要待售的 dealer/inventory 房产)</li>
            <li><strong>45 天内</strong>完成替代物业的书面识别(有数量与价值规则)</li>
            <li><strong>180 天内</strong>完成交割</li>
            <li>必须通过 <strong>Qualified Intermediary</strong>——你不能自己经手出售款</li>
            <li>必须 <strong>like-kind</strong>(美国境内的投资性不动产之间互换;美国与境外不动产之间不算 like-kind)</li>
            <li>为完全递延,替代物业的价值与负债通常需 <strong>≥ 原物业</strong>,否则差额(boot)部分需缴税</li>
          </ul>

          <h3 className={styles.trapSubtitle}>逃税的低级错误(不要犯)</h3>
          <ul className={styles.crossList}>
            <li><strong>虚增建安成本</strong>——美国施工方都开 W-9 + 1099,IRS 交叉比对极易发现</li>
            <li><strong>虚列人工成本</strong>——IRS + 劳工部 + 移民局多重交叉验证</li>
            <li><strong>阴阳合同</strong>——Title Company 和 Escrow 须 1099-S 报送</li>
            <li><strong>现金交易绕开申报</strong>——FinCEN(金融犯罪执法局)对房地产现金交易有 GTO(地理目标令)专项监控</li>
            <li><strong>离岸壳公司藏收入</strong>——CRS(共同申报准则)+ FATCA(海外账户税务合规法案)使这类操作风险极高</li>
          </ul>

          <h3 className={styles.trapSubtitleSmall}>教训</h3>
          <ul className={styles.trapTips}>
            <li>
              <strong>进入美国市场前,聘请一位有跨境经验的 CPA</strong>——专业税务规划带来的合法节税,往往远超其费用
            </li>
            <li>
              <strong>1031 是合法的递延工具,但要先搞清楚自己的房产是"投资性"还是"经销存货"</strong>——开发即售的项目很可能不符合 1031 资格
            </li>
            <li>
              <strong>房产持有结构(个人 / LLC / C-Corp / Trust)必须在买地前就和专业人士设计好</strong>——不同结构的税务待遇差别巨大,且影响 1031 与遗产规划
            </li>
            <li><strong>永远不要为了省税违法</strong>——美国 IRS 的稽查工具和数据库远超想象</li>
          </ul>
          <div className={styles.trapCallout}>
            <span className={styles.calloutLabel}>💡 延伸阅读</span>
            <p>
              关于公司架构、税务筹划、家族信托等更深层话题,SAREC 将在后续专题文章中详细展开。
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          陷阱 10
          ============================================================ */}
      <section className={styles.trap} id="trap-10">
        <div className={styles.trapInner}>
          <header className={styles.trapHeader}>
            <p className={styles.trapIndex}>陷阱 10 / 10</p>
            <h2 className={styles.trapTitle}>
              以为中国总部能救美国子公司——母子公司隔离的残酷现实
            </h2>
          </header>

          <h3 className={styles.trapSubtitle}>一个让所有中国开发商绝望的现实</h3>
          <p className={styles.trapBody}>
            中国开发商进入美国时,最常说的一句话是:
          </p>
          <p className={styles.trapBody}>
            <strong>"放心,钱不够中国总部还能调过来。"</strong>
          </p>
          <p className={styles.trapBody}>
            <strong>这句话在中国房地产行业的语境里,是真的——母公司是子公司的"无限信用背书"。</strong>
          </p>
          <p className={styles.trapBody}>
            <strong>在美国,这句话至少有 3 重错误。</strong>
          </p>

          <h3 className={styles.trapSubtitle}>错误 1:中国资本管制让钱出不来</h3>
          <p className={styles.trapBody}>
            中国国家外汇管理局(外管局)对资本项下外汇出境有严格管制:
          </p>
          <ul className={styles.trapList}>
            <li>个人每年合法换汇额度:<strong>5 万美元</strong></li>
            <li>企业境外投资:必须通过 <strong>ODI(境外投资)审批</strong>——发改委 + 商务部 + 外管局三道关</li>
            <li>房地产类境外投资:<strong>自 2017 年起被国务院列入"限制类"</strong>——审批极严</li>
            <li>紧急驰援境外子公司:<strong>几乎没有合法快速通道</strong></li>
          </ul>
          <p className={styles.trapBody}>
            <strong>真实场景</strong>:泛海控股境内有 340 亿元人民币的债务正在违约——
            <strong>即使想救洛杉矶项目,也无法把钱合法调出去</strong>。
          </p>

          <h3 className={styles.trapSubtitle}>错误 2:美国法律对母子公司的"独立性"要求极严</h3>
          <p className={styles.trapBody}>
            中国习惯中,母子公司之间资金、人员、决策都是"一锅炖"——业内叫"集团一盘棋"。
          </p>
          <p className={styles.trapBody}>
            <strong>在美国,这种做法叫"Piercing the Corporate Veil(刺破公司面纱)"的反向操作——你主动放弃了母子公司之间的法律隔离</strong>。
          </p>
          <p className={styles.trapBody}>
            这意味着——
            <strong>如果母公司确实可以无限输血,那么子公司的债务也可以追溯到母公司</strong>。中国开发商往往两边都想要:母公司可以救子公司(input),子公司出问题母公司不担责(output)。
          </p>
          <p className={styles.trapBody}>
            <strong>美国法律不允许两边都拿——你必须选一边</strong>。
          </p>

          <h3 className={styles.trapSubtitle}>错误 3:母公司本身正在出问题</h3>
          <p className={styles.trapBody}>
            中国房地产行业自 2021 年起进入深度调整周期。
            <strong>绝大多数曾经的"千亿级"开发商都已或正在陷入流动性危机</strong>:
          </p>
          <ul className={styles.trapList}>
            <li>恒大:境内境外全面违约</li>
            <li>碧桂园:海外债重组</li>
            <li>融创:海外债重组</li>
            <li>富力:海外债重组</li>
            <li><strong>泛海:境内 340 亿违约 + 美国资产全部丢失</strong></li>
            <li>大部分二三线房企:保交楼困难、停工、烂尾</li>
          </ul>
          <p className={styles.trapBody}>
            <strong>当中国总部自身难保时,美国子公司就是孤儿</strong>。
          </p>

          <h3 className={styles.trapSubtitle}>真实案例:泛海控股的"国内 + 美国"双重崩盘</h3>
          <div className={styles.tableScroller}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>维度</th>
                  <th>数据</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>国内境内债券违约</strong></td>
                  <td>47.37 亿元人民币(截至 2026 年 1 月)</td>
                </tr>
                <tr>
                  <td><strong>国内有息债务违约总额</strong></td>
                  <td>340.26 亿元人民币(截至 2026 年 1 月)</td>
                </tr>
                <tr>
                  <td><strong>境外美元债延期</strong></td>
                  <td>5 月份美元债剩余本金 1.34 亿美元,2026 年 3 月未能兑付,延期至 9 月</td>
                </tr>
                <tr>
                  <td><strong>美国洛杉矶项目损失</strong></td>
                  <td>至少 7.3 亿美元(投入 12 亿,回收 4.7 亿)</td>
                </tr>
                <tr>
                  <td><strong>美国旧金山项目损失</strong></td>
                  <td>约 19 亿元人民币(2020 年贱卖时)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.trapBody}>
            <strong>总损失(仅美国部分 + 境内可见部分):超过 500 亿元人民币</strong>。
          </p>
          <p className={styles.trapBody}>
            而这一切的开始,仅仅是 2018 年洛杉矶项目"边干边筹钱"那个看似无关紧要的决策。
          </p>

          <h3 className={styles.trapSubtitleSmall}>教训</h3>
          <ul className={styles.trapTips}>
            <li>
              <strong>进入美国市场前,必须假设"中国总部一分钱都调不出来"</strong>——这是合规底线,也是风险底线
            </li>
            <li>
              <strong>美国项目的资金结构必须 100% 自洽</strong>——所有的钱(自有 + EB-5 + Senior Construction Loan + 投资人)在项目启动前就必须落实
            </li>
            <li>
              <strong>保留 15-20% 的 Contingency</strong>——市场会波动、成本会超支、工期会延误,必须有缓冲
            </li>
            <li>
              <strong>不要让美国子公司过度依赖母公司</strong>——既保护母公司,也保护子公司
            </li>
            <li>
              <strong>如果在中国本身正面临行业调整压力,那不是进入美国扩张的好时机,是收缩巩固的时机</strong>——中国房地产巨头 2018-2022 年的"全球化扩张"基本以悲剧收场,这不是偶然
            </li>
          </ul>
        </div>
      </section>

      <PullQuote text="认知比资本更重要。" attribution="SAREC RESEARCH" />

      <RiskLedger
        eyebrow="RISK LEDGER · 10 大常见误区"
        title="中国资本进入美国房地产开发最常见的 10 个认知误区"
        items={riskLedgerItems}
      />

      {/* ============================================================
          第二部分:5 步合规进入美国市场的 Checklist
          ============================================================ */}
      <section className={styles.checklist}>
        <div className={styles.checklistInner}>
          <p className={styles.checklistEyebrow}>第二部分 · 合规作战路径</p>
          <h2 className={styles.checklistTitle}>5 步合规进入美国市场的 Checklist</h2>
          <p className={styles.checklistLead}>
            如果你看完了 10 大陷阱,并且仍然决定进入美国房地产开发市场——以下是 SAREC 推荐的{' '}
            <strong>5 步合规作战路径</strong>:
          </p>

          <div className={styles.checklistGrid}>
            <div className={styles.checklistStep}>
              <p className={styles.checklistStepIndex}>Step 1 · 启动前 3-6 个月</p>
              <h3 className={styles.checklistStepTitle}>合规结构搭建</h3>
              <ul className={styles.checklistStepList}>
                <li>选择正确的实体结构(LLC / LP / C-Corp / S-Corp)</li>
                <li>完成 EIN 注册、ITIN 申请(外国投资人)</li>
                <li>在加州/德州/佛州等目标州完成 Foreign Entity Registration</li>
                <li>聘请 4 位关键专业人士:跨境 CPA + Land Use Attorney + Corporate Attorney + Tax Attorney</li>
                <li>完成 FCPA Compliance Training(反海外腐败法合规培训)</li>
              </ul>
            </div>

            <div className={styles.checklistStep}>
              <p className={styles.checklistStepIndex}>Step 2 · 拿地前 1-3 个月</p>
              <h3 className={styles.checklistStepTitle}>项目可行性研究</h3>
              <ul className={styles.checklistStepList}>
                <li>完成 Entitlement Feasibility Study(审批可行性研究)</li>
                <li>完成 Product Feasibility Study(产品类型可行性研究——Condo vs Townhouse vs Detached House)</li>
                <li>完成 Zoning Analysis + Specific Plan Review</li>
                <li>评估 ED1 / Density Bonus / TOC 等政策红利的适用性</li>
                <li>Phase 1 Environmental Site Assessment(环境评估)</li>
              </ul>
            </div>

            <div className={styles.checklistStep}>
              <p className={styles.checklistStepIndex}>Step 3 · 动工前必须 100% 完成</p>
              <h3 className={styles.checklistStepTitle}>资金结构落实</h3>
              <ul className={styles.checklistStepList}>
                <li>自有资金到位</li>
                <li>EB-5 资金(如使用)的 Subscription Agreement 全部签署 + 资金 escrow 完成</li>
                <li><strong>Senior Construction Loan 协议签署 + 首笔放款条件全部满足</strong></li>
                <li>Title Insurance 出具</li>
                <li>All Risk Insurance 投保</li>
                <li>Performance Bond 和 Payment Bond 落实</li>
                <li>Contingency Fund(15-20%)单独账户</li>
              </ul>
            </div>

            <div className={styles.checklistStep}>
              <p className={styles.checklistStepIndex}>Step 4 · 建设期 18-36 个月</p>
              <h3 className={styles.checklistStepTitle}>施工与现金流管理</h3>
              <ul className={styles.checklistStepList}>
                <li>严格按 Draw Schedule 支付工程款(避免 Mechanic&rsquo;s Lien)</li>
                <li>每次付款收 Conditional Lien Release / Unconditional Lien Release</li>
                <li>通过 Disbursement Agent 管理建筑账户</li>
                <li>月度财务对账 + 季度独立审计</li>
                <li>每月汇报给 EB-5 投资人(如使用) + 银行</li>
              </ul>
            </div>

            <div className={styles.checklistStep}>
              <p className={styles.checklistStepIndex}>Step 5 · 销售前 6-12 个月规划</p>
              <h3 className={styles.checklistStepTitle}>退出与税务优化</h3>
              <ul className={styles.checklistStepList}>
                <li>评估销售 vs 长期持有</li>
                <li>如选择销售,提前规划 1031 Exchange(识别下一个项目)</li>
                <li>评估 Opportunity Zone 等额外税收激励</li>
                <li>评估资产转入 Family Trust 的可能性(长期持有策略)</li>
                <li>准备好下一个项目,让资金不停转</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FAQ
          ============================================================ */}
      <section className={styles.faq} id="faq">
        <div className={styles.faqInner}>
          <p className={styles.faqEyebrow}>FAQ · 常见问题</p>
          <h2 className={styles.faqTitle}>7 个常见问题</h2>

          <div className={styles.faqList}>
            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                Q1:中国房地产开发商在美国失败的最常见原因是什么?
              </h3>
              <p className={styles.faqAnswer}>
                按 SAREC 28 年中美地产经验观察,最常见的失败原因有三:
              </p>
              <ol className={styles.faqAnswerList}>
                <li>资金结构不完整就动工(特别是缺少 Senior Construction Loan)</li>
                <li>低估 Entitlement(审批)周期,把美国 18-36 个月当作中国 3-6 个月做财务模型</li>
                <li>误以为母公司可以无限支援美国子公司</li>
              </ol>
              <p className={styles.faqAnswer}>
                泛海洛杉矶 Oceanwide Plaza 项目三个错误全踩,最终亏损至少 7.3 亿美元。
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                Q2:Construction Loan 和 Bridge Loan 有什么区别?
              </h3>
              <p className={styles.faqAnswer}>
                Construction Loan(建筑贷款)专门用于项目建设期,通常按 Draw Schedule 分批拨款,建设期结束后转为 Permanent Loan(永久贷款)或被销售款偿还。
              </p>
              <p className={styles.faqAnswer}>
                Bridge Loan(过桥贷款)是短期周转贷款,通常 6-24 个月,利率高(10-15%),用于在永久融资到位前的过渡期。
              </p>
              <p className={styles.faqAnswer}>
                中国开发商常见的错误是用 Bridge Loan 当 Construction Loan 使用,导致利息成本过高 + 续贷压力。
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                Q3:EB-5 资金做美国房地产开发安全吗?
              </h3>
              <p className={styles.faqAnswer}>EB-5 资金成本低(年化 0.5-2%),但有三个风险:</p>
              <ol className={styles.faqAnswerList}>
                <li>EB-5 投资人首要目标是绿卡,不是收益——项目一旦延期或岗位创造不达标,投资人会立刻发起诉讼</li>
                <li>EB-5 资金退出期固定(5-7 年),不能像银行贷款那样灵活展期</li>
                <li>集体诉讼威力极大——泛海项目就是被 EB-5 投资人集体追索后崩盘</li>
              </ol>
              <p className={styles.faqAnswer}>
                建议:EB-5 可以用,但不能作为主轴资金(不超过 capital stack 的 20%)。
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                Q4:加州的 Entitlement 周期为什么这么长?
              </h3>
              <p className={styles.faqAnswer}>
                加州的房地产开发审批周期长(18-36 个月)主要因为:
              </p>
              <ol className={styles.faqAnswerList}>
                <li>CEQA(加州环境质量法)要求详细的环境影响评估</li>
                <li>Discretionary Review(自由裁量审查)允许政府部门和邻居反对</li>
                <li>Public Hearing(公开听证)必须召开</li>
                <li>Plan Check 的多轮迭代</li>
              </ol>
              <p className={styles.faqAnswer}>
                加速通道:洛杉矶市的 ED1(Executive Directive 1)针对 100% Affordable Housing 项目可将审批时间压缩到 4-6 个月。
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                Q5:中国开发商如何避免 Mechanic&rsquo;s Lien 风险?
              </h3>
              <p className={styles.faqAnswer}>四个核心做法:</p>
              <ol className={styles.faqAnswerList}>
                <li>严格按合同节点支付工程款,逾期 30 天就是 lien 红线</li>
                <li>每次付款收取 Lien Waiver(包括 Conditional 和 Unconditional 两种)</li>
                <li>通过 Title Company 或 Disbursement Agent 管理建筑账户,确保专款专用</li>
                <li>一旦 Lien 出现,立即处理(支付、Lien Bond、或起诉移除),绝不拖延</li>
              </ol>
            </div>

            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>Q6:1031 Exchange 是什么?怎么用?</h3>
              <p className={styles.faqAnswer}>
                1031 Exchange 是美国国内税法第 1031 条款允许的"同类资产置换"——
                <strong>为投资或生产经营目的而持有</strong>的房地产,出售后将收益再投入同类房地产,可以
                <strong>递延</strong>资本利得税。
              </p>
              <p className={styles.faqAnswer}>
                核心规则:45 天内书面识别替代物业,180 天内完成交割,必须通过 Qualified Intermediary,替代物业价值通常需 ≥ 原物业。
              </p>
              <p className={styles.faqAnswer}>
                <strong>重要</strong>:1031 是"递延",不是"免除";而且
                <strong>主要用于待售的开发存货(dealer property / inventory)通常不符合 1031 资格</strong>——开发即售的项目要特别注意。"递延 + 持有至身故后由继承人 step-up 计税基础"是一种长期规划,但能否减免税要综合遗产税、身份、州税及未来法律变化判断,不等于自动"完全免税"。具体务必咨询跨境 CPA 和税务律师。
              </p>
            </div>

            <div className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>
                Q7:在美国做房地产开发,应该选 LLC 还是 C-Corp?
              </h3>
              <p className={styles.faqAnswer}>简化回答:</p>
              <ul className={styles.faqBulletList}>
                <li>
                  <strong>个人投资者 / 小型项目</strong>:通常选 LLC(pass-through 税务待遇,避免双重征税)
                </li>
                <li>
                  <strong>多投资人 / 大型项目</strong>:可能用 LP(有限合伙) + LLC GP 结构
                </li>
                <li>
                  <strong>拟 IPO / 大额融资</strong>:可能选 C-Corp(虽有双重征税,但融资结构灵活)
                </li>
                <li>
                  <strong>外国投资人</strong>:常用 LLC + Blocker Corporation 结构降低税务复杂度
                </li>
              </ul>
              <p className={styles.faqAnswer}>
                具体选择必须根据:投资人国籍、退出方式、未来融资计划、家族传承规划综合决定。建议进入美国前就聘请专业律师 + CPA 设计架构。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          免责声明
          ============================================================ */}
      <section className={styles.finalCopyBlock}>
        <div className={styles.finalCopyInner}>
          <p className={styles.finalCopyEyebrow}>LEGAL · 免责声明</p>
          <h2>重要说明</h2>
          <p>
            本文仅供<strong>商业教育与风险提示</strong>之用,
            <strong>不构成法律、税务、证券投资、移民法律、融资承诺或房地产经纪服务建议</strong>。美国房地产开发涉及的法律、税务、移民、海关规则高度复杂且因地、因时、因人而异,并随政策与法律修订不断变化。文中所有数据、流程、税率、政策细节均为撰文时的概述,可能已发生变化。任何具体决策,务必咨询具备相应执照的专业人士(律师、CPA、报关行、持牌经纪等)。
          </p>
          <p>
            文中所引案例均基于公开报道与公开法律文书。涉及尚在审理中的案件,相关被告依法享有无罪推定,本文不对任何案件的最终结果作出判断。
          </p>
        </div>
      </section>

      {/* ============================================================
          公开资料来源
          ============================================================ */}
      <section className={styles.finalCopyBlock}>
        <div className={styles.finalCopyInner}>
          <p className={styles.finalCopyEyebrow}>SOURCES · 公开资料来源</p>
          <h2>公开资料来源</h2>
          <p>本文案例与数据主要参考以下公开来源:</p>
          <ul className={styles.sourceList}>
            <li>
              <strong>泛海 / Oceanwide Plaza 项目</strong>:The Real Deal、Los Angeles Times、California Construction News 等公开报道,以及泛海控股公开披露的债务公告
            </li>
            <li>
              <strong>EB-5 违约通知细节</strong>:The Real Deal 2023 年公开报道
            </li>
            <li>
              <strong>洛杉矶 ED1 政策</strong>:洛杉矶市长办公室 Executive Directive 1 文本、Los Angeles Times、The Real Deal 2025 年报道
            </li>
            <li>
              <strong>加州 ADU 政策</strong>:加州 HCD(住房与社区发展部)公开规定
            </li>
            <li>
              <strong>富力 / 张力案</strong>:美国司法部公开起诉书、彭博社、南华早报(SCMP)、SF Standard、Mingtiandi 等公开报道,英国法院公开记录
            </li>
            <li>
              <strong>旧金山建材转口案</strong>:美国司法部 2025 年 12 月公开起诉书与新闻稿(案件审理中)
            </li>
            <li>
              <strong>1031 Exchange / EB-5 流程</strong>:美国国内税法第 1031 条、USCIS 公开的 EB-5 流程说明
            </li>
          </ul>
          <p>如需核实任何细节,建议查阅上述一手来源。</p>
        </div>
      </section>

      {/* ============================================================
          作者署名 + SAREC 简介
          ============================================================ */}
      <section className={styles.finalCopyBlock}>
        <div className={styles.finalCopyInner}>
          <p className={styles.finalCopyEyebrow}>AUTHOR · 作者署名</p>
          <h2>关于作者与 SAREC</h2>
          <p>
            <strong>东哥</strong>——SAREC 中美房地产商会创始人,28 年中美房地产从业经验,亲历过 6 个完整的市场周期,主导和参与过中美两端总开发面积 200+ 万平方英尺的项目。专长:跨境地产开发合规、企业出海架构、AI 驱动获客系统、家族资产配置。
          </p>
          <p>
            <strong>SAREC(Sino-American Real Estate Chamber,中美房地产商会)</strong>{' '}
            是面向想做美国房地产开发的中国资本(华人华侨、准备来美的中国人、中国开发商/投资人、高净值家庭、房地产相关产业从业者)的合规咨询、资源撮合与商业智库平台。
          </p>
          <p>
            <strong>发布日期</strong>:2026 年 5 月 27 日 ·{' '}
            <strong>最后更新</strong>:2026 年 5 月 27 日
          </p>
          <p>
            <strong>版权声明</strong>:本文为 SAREC 原创内容,案例信息均来自公开报道(来源包括 The Real Deal、Los Angeles Times、California Construction News、South China Morning Post、Bloomberg、SF Standard、Mingtiandi、彭博社、美国司法部公开起诉书等)。引用请注明出处。
          </p>
        </div>
      </section>

      <RelatedResearch
        items={relatedLinks.map((r) => ({
          label: r.label,
          href: r.href,
          eyebrow: 'SAREC RESEARCH'
        }))}
      />

      <ConversionBlock
        question="你的下一步是什么?"
        intents={conversionIntents}
        contactLine="SAREC 不是流量平台,是中美房地产开发的智库与资源枢纽。我们只接有真实意向的客户。"
      />
    </main>
  );
}
