import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import { ArticleHero } from '@/components/sections/research/ArticleHero';
import { ArticleSection } from '@/components/sections/research/ArticleSection';
import { RelatedResearch } from '@/components/sections/research/RelatedResearch';
import { OpeningJudgment } from '@/components/sections/research/OpeningJudgment';
import { ResearchMap } from '@/components/sections/research/ResearchMap';
import { RiskLedger } from '@/components/sections/research/RiskLedger';
import { MidArticleCTA } from '@/components/sections/research/MidArticleCTA';
import { ConversionBlock } from '@/components/sections/research/ConversionBlock';

export const metadata: Metadata = createPageMetadata({
  title: '中国投资人美国房地产常见风险｜SAREC Insights',
  description:
    '本文从信息不对称、审批周期、融资可行性、租金假设、微区位、LP/GP合作结构、信息披露和退出路径等角度，分析中国投资人参与美国房地产项目时常见的风险和判断框架。',
  path: '/zh/research/chinese-investors-us-real-estate-risks',
  type: 'article'
});

const tags = ['SAREC Insights', '跨境投资风险', '美国房地产项目判断', '华人投资人指南'];

const riskSections = [
  {
    title: '1. 信息不对称：看到了项目，不等于看懂了项目',
    body:
      '中国投资人常常通过朋友介绍、项目方路演、微信群、饭局或熟人推荐接触美国项目。但项目信息往往经过包装，投资人看到的是结果描述，而不是底层资料。',
    pointsTitle: '需要判断',
    points: ['土地资料是否完整', '审批状态是否清楚', '融资路径是否真实', '建设成本是否有依据', '租金和退出假设是否可验证', '合作方是否有履约能力'],
    summary: '美国项目不是不能投，而是不能只听介绍就投。'
  },
  {
    title: '2. 经验迁移风险：中国开发经验不能直接复制到美国',
    body:
      '中国房地产开发曾经高度依赖速度、规模、销售和市场上行周期。美国市场更强调分区、permit、entitlement、社区规则、合同机制、金融信用和长期持有逻辑。',
    pointsTitle: '中国投资人容易误判',
    points: ['审批速度', '建设周期', '人工成本', '贷款条件', '销售去化', '租赁需求', '退出流动性'],
    summary: '过去成功的经验，如果不经过本地化验证，可能变成新的风险来源。'
  },
  {
    title: '3. 审批风险：不是图纸画出来，项目就能建',
    body:
      '美国房地产项目往往受到 zoning、planning、permit、building and safety、fire department、utility、environmental review 等多个环节影响。即使是政策支持型项目，也要满足具体条件。ED1 等政策可能提高部分 100% affordable housing 项目的审批效率，但政策红利并不意味着所有项目都自动顺利推进。具体项目仍需看土地条件、适用资格、图纸、部门协调和最新政策变化。',
    pointsTitle: '判断重点',
    points: ['项目是否真正符合政策条件', '当前处于 entitlement、plan check、RTI 还是 permit 阶段', '关键部门是否还有未解决问题', '是否存在社区、历史资源、消防、公用事业等限制', '审批路径是否选错'],
    summary: '审批不是形式问题，而是项目是否真实可推进的核心问题。'
  },
  {
    title: '4. 融资风险：建筑贷款不是想拿就能拿',
    body:
      '很多跨境投资人会假设项目可以通过建筑贷款、再融资或出售顺利完成资金闭环。但在美国，贷款机构会看借款人信用、项目经验、担保能力、资产负债、项目预算、租金假设、利率环境和退出路径。',
    pointsTitle: '新移民或新项目方常见问题',
    points: ['缺少美国本地信用记录', '缺少开发履历', '银行不认可项目方经验', '建筑贷款条件变化', '利率上升导致现金流承压', '再融资时间不确定'],
    summary: '融资路径必须在投资前验证，而不是项目买下后再想办法。'
  },
  {
    title: '5. 市场风险：大概念不能替代微区位调研',
    body:
      '靠近大学、医院、地铁、商圈、就业中心，并不自动等于项目安全。真正决定出租和退出的是微区位、街区环境、交通方式、目标客群、竞争供给和价格敏感度。SAREC 在脱敏案例中也反复看到，市场标签如果没有落到具体街区和真实可比项目，很容易形成误判。',
    pointsTitle: '需要判断',
    points: ['目标租客是谁', '是否愿意住在这个具体位置', '同类供给是否过剩', '租金假设是否来自真实可比项目', '空置率是否充分考虑', '项目是否可能从预期客群转向其他客群'],
    summary: '市场标签不是市场调研。'
  },
  {
    title: '6. 建设风险：成本超支和延期会重写项目结果',
    body:
      '美国开发项目中，人工成本、材料价格、承包商报价、设计变更、检查、保险、利率和持有成本都会影响最终结果。',
    pointsTitle: '投资人需要关注',
    points: ['硬成本是否有 GC 报价支持', '软成本是否完整', 'contingency 是否充分', '工期是否过于乐观', '延期成本如何承担', '谁负责项目管理和监督'],
    summary: '项目利润往往不是被一个大错误吃掉，而是被多个小延误和小超支逐步消耗。'
  },
  {
    title: '7. 合作结构风险：项目好，不代表合作结构安全',
    body:
      '很多跨境投资人关注项目本身，却忽略资金进入方式、权责分配、信息披露、重大事项决策和退出机制。',
    pointsTitle: '需要提前明确',
    points: ['谁是 GP，谁负责项目管理', 'LP 有哪些权利', '资金如何进入和使用', '是否有独立账户或资金监管', '信息披露频率', '超支、延期、融资失败如何处理', '退出决策由谁决定', '利润分配和费用机制是否清楚'],
    summary: '真正保护投资人的，往往不是项目宣传材料，而是合作结构和信息披露机制。'
  },
  {
    title: '8. 退出风险：能建成，不等于一定能按预期退出',
    body:
      '项目退出可能依赖出售、再融资或长期持有。每种退出方式都受市场周期、利率、租金、cap rate、买家需求、贷款条件和税务安排影响。',
    pointsTitle: '常见误判',
    points: ['假设 cap rate 不变', '假设租金持续上涨', '假设买家随时存在', '假设再融资一定成功', '忽视持有期间现金流压力', '忽视市场下行时的退出折价'],
    summary: '退出路径不是一句“卖掉就可以”，而是需要提前设计和动态验证。'
  },
  {
    title: '9. EB-5 相关风险：投资逻辑和移民逻辑必须同时看',
    body:
      '如果项目涉及 EB-5，投资人不仅要看项目本身，还要看资金是否符合规则、就业创造是否有依据、区域中心或项目方是否可靠、退出安排是否符合要求，以及移民结果的不确定性。EB-5 投资需要满足相关移民规则和 at-risk 要求。任何项目都不能简单写成既承诺投资安全、又承诺移民结果。涉及 EB-5 的问题应咨询专业移民律师和相关合规机构。',
    pointsTitle: '需要同时关注',
    points: ['项目风险和资金路径', '就业创造依据', '区域中心或项目方背景', '退出安排与规则要求', '移民流程中的不确定性'],
    summary: 'EB-5 项目不是单纯房地产投资，也不是单纯移民服务，而是投资、就业创造、资金路径和移民规则交织的复杂结构。'
  }
];

const screeningPoints = [
  '项目基本资料是否完整',
  '土地和审批状态是否清楚',
  '市场和租金假设是否可验证',
  '建设成本和融资路径是否合理',
  '合作方背景和履约能力',
  'LP / GP 合作结构',
  '信息披露机制',
  '退出路径和风险预案',
  '是否需要律师、会计师、贷款机构、保险顾问或其他专业人士参与'
];

const relatedLinks = [
  { title: '项目判断框架', href: '/zh/research/framework/' },
  { title: '风险披露', href: '/zh/legal/risk-disclosure/' },
  { title: '项目初筛服务', href: '/zh/services/strategy/' },
  { title: '案例研究', href: '/zh/case-studies/' }
];

const introParagraphs = [
  '很多中国投资人来到美国后，会自然地把过去熟悉的房地产经验带入美国市场。中国房地产曾经经历高速开发、快速销售和强市场周期，美国房地产则更强调规则、审批、合同、融资、持有成本、信息披露和专业分工。',
  '美国房地产并不简单，也不天然安全。它的机会往往建立在清晰规则之上，但风险也藏在规则细节之中。对于跨境投资人而言，真正重要的是建立一套可以反复使用的项目判断框架。'
];

const conclusionParagraphs = [
  '美国房地产市场有长期价值，也有真实机会。但对中国投资人和美国华人投资人而言，专业不是把一个项目讲得更诱人，而是把项目背后的风险、条件、结构和假设讲清楚。',
  '如果一个项目经不起土地、审批、融资、建设、租赁、退出和合作结构的连续追问，就不应该急着推进。SAREC 希望帮助跨境客户在美国房地产市场中，先建立判断能力，再讨论合作机会。'
];

const noticeBody =
  '本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。房地产投资、项目开发、融资、保险、税务、法律、EB-5 和跨境交易均涉及风险。具体事项应结合项目资料、合同文件和相关持牌或专业人士意见审慎判断。';

const researchMapKeywords = [
  { keyword: '信息不对称', anchor: 'section-01' },
  { keyword: '经验迁移', anchor: 'section-02' },
  { keyword: '审批风险', anchor: 'section-03' },
  { keyword: '融资风险', anchor: 'section-04' },
  { keyword: '市场风险', anchor: 'section-05' },
  { keyword: '建设风险', anchor: 'section-06' },
  { keyword: '合作结构', anchor: 'section-07' },
  { keyword: '退出风险', anchor: 'section-08' },
  { keyword: 'EB-5 风险', anchor: 'section-09' }
];

const researchMapItems = researchMapKeywords.map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: riskSections[i].title
}));

const heroAnchors = researchMapKeywords.slice(0, 3).map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: riskSections[i].title
}));

const conversionIntents = [
  { label: '你有具体项目', ctaText: '提交项目初筛', href: '/zh/services/strategy/' },
  { label: '你想继续研究', ctaText: '返回研究中心', href: '/zh/research' },
  { label: '你想保持联系', ctaText: '联系我们', href: '/zh/contact/' }
];

export default function ChineseInvestorsUsRealEstateRisksPage() {
  return (
    <main style={{ background: 'var(--ink-deepest)', color: 'var(--ivory)' }}>
      <ArticleHero
        eyebrow="SAREC INSIGHTS · 跨境投资风险"
        title="中国投资人美国房地产常见风险"
        summary="美国房地产市场规则稳定、资产透明度较高，但对跨境投资人而言，真正的风险往往不在“有没有项目”，而在是否理解土地、审批、融资、建设、租赁、退出和合作结构背后的真实逻辑。"
        tags={tags}
        heroVideo={{
          src: '/videos/research/chinese-investors-us-real-estate-risks-hero.mp4',
          poster: '/images/research/chinese-investors-us-real-estate-risks-poster.jpg'
        }}
        primaryCta={{ label: '查看风险披露', href: '/zh/legal/risk-disclosure/' }}
        secondaryCta={{ label: '提交项目初筛', href: '/zh/services/strategy/' }}
        anchors={heroAnchors}
      />

      <OpeningJudgment
        judgment="先建立一套可以反复使用的判断框架"
        introParagraphs={introParagraphs}
      />

      <ResearchMap
        eyebrow="RESEARCH MAP · 本文导读"
        title="九类常见风险"
        items={researchMapItems}
      />

      <ArticleSection id="section-01" index={1} {...riskSections[0]} width="default" />
      <ArticleSection id="section-02" index={2} {...riskSections[1]} width="default" />
      <ArticleSection id="section-03" index={3} {...riskSections[2]} width="default" />
      <ArticleSection id="section-04" index={4} {...riskSections[3]} width="default" />
      <ArticleSection id="section-05" index={5} {...riskSections[4]} width="default" />

      <MidArticleCTA
        body="如果你正在判断一个美国房地产项目，可以先做一次项目初筛。"
        ctaLabel="提交项目初筛"
        ctaHref="/zh/services/strategy/"
      />

      <ArticleSection id="section-06" index={6} {...riskSections[5]} width="default" />
      <ArticleSection id="section-07" index={7} {...riskSections[6]} width="default" />
      <ArticleSection id="section-08" index={8} {...riskSections[7]} width="default" />
      <ArticleSection id="section-09" index={9} {...riskSections[8]} width="default" />

      <RiskLedger
        eyebrow="SAREC SCREENING · 项目初筛"
        title="项目初筛要点"
        items={screeningPoints}
      />

      <ArticleSection
        title="真正的机会，首先应该经得起问题"
        paragraphs={conclusionParagraphs}
        width="default"
      />

      <ArticleSection
        title="重要说明"
        body={noticeBody}
        width="default"
      />

      <RelatedResearch
        items={relatedLinks.map((r) => ({
          label: r.title,
          href: r.href,
          eyebrow: 'SAREC RESEARCH'
        }))}
      />

      <ConversionBlock
        question="你现在最需要做什么决定?"
        intents={conversionIntents}
        contactLine="你可以提交项目资料、项目介绍或合作需求。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。"
      />
    </main>
  );
}
