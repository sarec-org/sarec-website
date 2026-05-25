import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import { ArticleHero } from '@/components/sections/research/ArticleHero';
import { ArticleSection } from '@/components/sections/research/ArticleSection';
import { RelatedResearch } from '@/components/sections/research/RelatedResearch';
import { OpeningJudgment } from '@/components/sections/research/OpeningJudgment';
import { SarecFramework } from '@/components/sections/research/SarecFramework';
import { MidArticleCTA } from '@/components/sections/research/MidArticleCTA';
import { ConversionBlock } from '@/components/sections/research/ConversionBlock';

export const metadata: Metadata = createPageMetadata({
  title: 'Cap Rate / IRR / ROE 如何理解｜SAREC Insights',
  description:
    '本文解释美国房地产投资中常见的 Cap Rate、IRR、ROE、NOI、现金流、退出估值等指标，帮助中国投资人理解收益指标背后的假设、风险和判断方法。',
  path: '/zh/research/cap-rate-irr-roe',
  type: 'article'
});

const tags = ['SAREC Insights', '房地产投资指标', 'Cap Rate', 'IRR', 'ROE', '项目判断'];

const metricDrivers = [
  '土地成本',
  '建设成本',
  '软成本',
  '融资成本',
  '租金或销售价格',
  '运营费用',
  '空置率',
  '持有周期',
  '出售价格',
  '退出 cap rate',
  '税务和交易成本',
  'LP / GP 分配结构'
];

const articleSections = [
  {
    title: '1. NOI：先看项目本身能不能产生真实经营收入',
    body:
      'NOI，Net Operating Income，通常可以理解为净运营收入。对于出租型房地产项目，NOI 是判断资产运营能力的重要基础。NOI 通常等于物业收入减去运营费用，但不包括贷款本息、折旧、所得税和资本性支出等项目。',
    pointsTitle: '投资人需要关注',
    points: ['租金收入是否来自真实市场比较', '空置率是否合理', '运营费用是否完整', '管理费、维修、保险、税费是否充分考虑', '是否有一次性收入或不可持续收入', '是否低估了未来维修和储备支出'],
    summary: '如果 NOI 不可靠，后面的 Cap Rate、估值和退出判断都会失真。'
  },
  {
    title: '2. Cap Rate：它不是收益保证，而是估值语言',
    body:
      'Cap Rate，资本化率，是美国房地产投资中非常常见的指标。一般可以理解为物业净运营收入与物业价值之间的关系，常见表达是 Cap Rate = NOI / Property Value，或 Property Value = NOI / Cap Rate。但投资人要特别注意：Cap Rate 不是固定收益率，也不是项目保证回报。它更像是一种市场估值语言，用来比较不同资产、不同区域、不同风险水平下的价格。',
    pointsTitle: '需要判断',
    points: ['这个 cap rate 是否符合当前市场', '可比交易是否真实', '资产类型是否可比', '区域、租户、租约、物业状态是否可比', '项目使用的是当前 cap rate 还是未来退出 cap rate', '退出 cap rate 是否过于乐观'],
    note: '如果项目用较低 cap rate 计算退出价值，估值会被放大；如果市场要求更高 cap rate，退出价值可能明显下降。',
    summary: 'Cap Rate 不是一个孤立数字，而是市场对风险、增长和资产质量的定价。'
  },
  {
    title: '3. Exit Cap Rate：很多项目收益差异，来自退出假设',
    body:
      '很多开发项目或增值型项目，收益测算中最敏感的部分之一，就是退出价值。退出价值往往根据未来 NOI 和退出 cap rate 计算。如果项目假设未来 NOI 提高，同时退出 cap rate 较低，模型会显示较高的项目价值。但如果市场利率上升、买家减少、区域风险提高，退出 cap rate 可能上升，项目估值就会下降。',
    pointsTitle: '投资人需要问',
    points: ['退出 cap rate 是否有当前市场依据', '是否参考了真实可比交易', '是否考虑利率变化', '是否做了敏感性分析', '如果 cap rate 上升，项目还是否成立', '如果退出延后，现金流是否能支撑'],
    summary: '开发项目不是建成就自动高价退出，退出 cap rate 的假设必须经得起压力测试。'
  },
  {
    title: '4. IRR：它衡量时间维度下的收益，但很容易被误读',
    body:
      'IRR，Internal Rate of Return，内部收益率，是衡量项目现金流时间价值的指标。它考虑了资金投入和回收发生的时间，因此常用于开发项目、私募项目和多阶段投资。IRR 有价值，因为它反映时间效率；但 IRR 也容易被误读。',
    pointsTitle: '常见误区',
    points: ['只看 IRR，不看项目总利润', '只看 IRR，不看本金安全边际', '只看 IRR，不看现金流波动', '只看 IRR，不看项目延期风险', '只看 IRR，不看退出假设', '只看 IRR，不看 LP / GP 分配结构'],
    note: '短周期项目如果很快回款，IRR 可能较高；但如果项目延期，IRR 可能明显下降。开发项目中，时间拖长会显著改变 IRR。',
    summary: 'IRR 不是越高越好，而是要看它是否来自可靠现金流、合理周期和可验证退出。'
  },
  {
    title: '5. IRR 最容易被美化的 6 个地方',
    body:
      '一个模型中的 IRR 并不是独立存在的，它会受到开发周期、成本预算、租金或售价、退出 cap rate、融资条件和压力测试方式影响。',
    pointsTitle: '需要重点检查',
    points: ['开发周期过短：审批、施工、融资和市场接受都可能延迟', '成本预算过低：硬成本、软成本、利息、保险、税费、contingency 和管理费用如果低估，IRR 会被抬高', '租金或售价过高：乐观收入假设会推高收入和退出价值', '退出 cap rate 过低：较低的 cap rate 会放大退出估值', '没有充分考虑融资条件：利率、贷款比例、放款节点、贷款费用和再融资条件都会影响结果', '没有做压力测试：如果没有 downside case，投资人很难判断风险边界'],
    summary: '一个好模型应该帮助投资人看清风险，而不是只展示最漂亮的版本。'
  },
  {
    title: '6. ROE：股权回报要结合杠杆和风险一起看',
    body:
      'ROE，Return on Equity，通常可以理解为股权回报率。房地产项目中，ROE 常常受到杠杆影响。使用贷款可以提高股权回报，但也会放大风险。',
    pointsTitle: '投资人需要理解',
    points: ['ROE 高，可能来自项目本身好', 'ROE 高，也可能来自高杠杆', '高杠杆会增加利率风险', '高杠杆会增加再融资风险', '高杠杆会减少项目安全边际', '市场下行时，高杠杆项目更容易承压'],
    summary: 'ROE 不能脱离杠杆结构单独看。股权回报越高，越要问风险由谁承担。'
  },
  {
    title: '7. Cash-on-Cash Return：现金流项目要看实际可分配现金',
    body:
      'Cash-on-Cash Return 通常用于衡量投资人投入现金与年度现金回报之间的关系。对于持有型物业，它比单纯估值指标更接近投资人的实际体验。',
    pointsTitle: '投资人需要关注',
    points: ['现金流是否在扣除贷款本息后仍然稳定', '是否扣除了资本性支出储备', '是否考虑空置率', '是否考虑维修和管理成本', '是否有临时补贴或一次性收入', '是否可能因再融资或利率变化而下降'],
    summary: '纸面收益不等于可分配现金。真正重要的是税后、费用后、债务后的实际现金流。'
  },
  {
    title: '8. Payback Period：回本周期越短，不代表风险一定越低',
    body:
      'Payback Period，回本周期，常用于说明项目多久能通过现金流或退出回收投资。但它不能单独判断项目安全。',
    pointsTitle: '需要注意',
    points: ['回本周期没有充分反映时间价值', '可能忽略回本后的项目风险', '可能忽略退出市场变化', '可能忽略税务和交易成本', '可能忽略资本占用期间的机会成本'],
    summary: '回本周期是辅助指标，不是最终判断标准。'
  },
  {
    title: '9. 不同情景测算，是为了看风险边界',
    body:
      '成熟的房地产项目判断，通常不会只看一个版本的模型。Base Case、Plus Case、Downside Case 或 Sensitivity Analysis 的意义，是帮助投资人理解项目在不同市场条件下的表现。',
    pointsTitle: '需要看',
    points: ['Base Case 是否保守', 'Plus Case 是否只是乐观假设', 'Downside Case 是否真正考虑风险', '哪些变量最敏感', '成本上升时结果如何', '租金下降时结果如何', '出口 cap rate 上升时结果如何', '项目延期时结果如何'],
    summary: '真正有价值的模型，不是告诉你最好结果，而是告诉你坏情况出现时项目还能不能承受。'
  },
  {
    title: '10. 投资人看模型时，应该先问这 10 个问题',
    body:
      '看模型不是看一张表，而是把每一个假设拆开验证。指标越复杂，越需要回到最基础的收入、成本、融资、时间和退出假设。',
    pointsTitle: '模型检查问题',
    points: ['收入假设来自哪里？', '成本预算是否有报价或依据？', '软成本是否完整？', '空置率和运营费用是否保守？', '融资条件是否已经验证？', '建设周期是否合理？', '退出 cap rate 是否有市场依据？', '是否做了 downside case？', 'LP / GP 分配后，投资人实际拿到什么？', '如果项目延期、超支或市场下行，谁承担风险？'],
    summary: '看模型不是看一张表，而是把每一个假设拆开验证。'
  }
];

const sarecFramework = [
  'NOI 是否真实',
  '租金和空置率是否可验证',
  '建设成本是否充分',
  '软成本和融资成本是否完整',
  '退出 cap rate 是否保守',
  'IRR 是否过度依赖短周期或高退出估值',
  'ROE 是否依赖过高杠杆',
  'LP / GP 分配后投资人实际结果如何',
  '是否做 downside case',
  '是否有信息披露和动态更新机制'
];

const relatedLinks = [
  { title: '美国房地产开发完整流程', href: '/zh/research/us-real-estate-development-process/' },
  { title: 'LP / GP 合作结构详解', href: '/zh/research/lp-gp-structure/' },
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: '案例研究', href: '/zh/case-studies/' }
];

const introParagraphs = [
  '中国投资人看美国房地产项目时，经常会看到几个熟悉又容易误解的指标：Cap Rate、IRR、ROE、NOI、Cash Flow、Exit Value、Payback Period 等。',
  '这些指标有用，但它们不是答案。它们只是把一组假设转化成数字。如果假设不可靠，数字越漂亮，风险可能越大。',
  '真正专业的项目判断，不是问“这个项目 IRR 有多少”，而是问：这个 IRR 是怎么来的？租金假设是否可靠？建设成本是否充分？融资条件是否真实？退出 cap rate 是否保守？工期是否合理？如果市场变化，结果会怎样？这类问题也需要结合项目判断框架一起看。'
];

const coreViewBody =
  'Cap Rate、IRR、ROE 这些指标，本质上都是计算结果。它们反映的是项目在某些假设下可能呈现的收益特征，但不能替代对项目本身的判断。项目开发流程和合作结构的变化，都会重新塑造指标结果。';

const sarecFrameworkBody =
  'SAREC 不把 Cap Rate、IRR、ROE 当成销售话术，而是把它们作为项目判断的入口。我们更关注这些指标背后的假设是否可靠、风险是否充分披露、结构是否清晰、项目是否经得起压力测试。指标也应结合 LP / GP 合作结构判断。';

const conclusionParagraphs = [
  'Cap Rate、IRR、ROE 都是有用指标，但它们不是项目本身。一个项目是否值得继续看，不能只由某个漂亮数字决定。',
  '对中国投资人和美国华人投资人而言，真正重要的是看清：收入如何产生，成本是否完整，融资是否可靠，退出是否现实，时间是否合理，合作结构是否保护投资人。',
  '指标越漂亮，越应该回到假设。只有当假设经得起验证，风险被清楚披露，结构被认真设计，项目才值得进入下一步讨论。相关风险背景也可以继续阅读中国投资人美国房地产常见风险。'
];

const noticeBody =
  '本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。房地产投资、项目开发、融资、税务、保险、法律和跨境交易均涉及复杂风险。具体事项应结合项目资料、财务模型、合同文件和相关持牌或专业人士意见审慎判断。';

const heroAnchors = [
  { keyword: 'NOI', anchor: 'metric-01', fullTitle: articleSections[0].title },
  { keyword: 'Cap Rate', anchor: 'metric-02', fullTitle: articleSections[1].title },
  { keyword: 'IRR', anchor: 'metric-04', fullTitle: articleSections[3].title }
];

const conversionIntents = [
  { label: '你有具体项目', ctaText: '提交项目初筛', href: '/zh/services/strategy/' },
  { label: '你想继续研究', ctaText: '返回研究中心', href: '/zh/research' },
  { label: '你想保持联系', ctaText: '联系我们', href: '/zh/contact/' }
];

export default function CapRateIrrRoePage() {
  return (
    <main style={{ background: 'var(--ink-deepest)', color: 'var(--ivory)' }}>
      <ArticleHero
        eyebrow="SAREC INSIGHTS · 投资指标"
        title="Cap Rate / IRR / ROE 如何理解"
        summary="美国房地产项目中，很多投资人第一眼看的是收益指标。但真正专业的判断，不是记住一个 Cap Rate、IRR 或 ROE 数字，而是看清这些指标背后的收入、成本、融资、时间、退出和风险假设。"
        tags={tags}
        heroVideo={{
          src: '/videos/research/cap-rate-irr-roe-hero.mp4',
          poster: '/images/research/cap-rate-irr-roe-poster.jpg'
        }}
        primaryCta={{ label: '查看项目判断框架', href: '/zh/research/framework/' }}
        secondaryCta={{ label: '提交项目初筛', href: '/zh/services/strategy/' }}
        anchors={heroAnchors}
        mediaCaption="VALUATION / RETURN METRICS / INVESTMENT JUDGMENT"
      />

      <OpeningJudgment
        judgment="指标有用，但指标不是答案"
        introParagraphs={introParagraphs}
      />

      <ArticleSection
        title="房地产投资指标是结果，不是原因"
        body={coreViewBody}
        pointsTitle="一个项目的指标通常由以下因素共同决定"
        points={metricDrivers}
        summary="如果只看指标，不看假设，就像只看体检报告上的一个数字，却不问身体真实状况。"
        width="default"
      />

      <ArticleSection
        id="metric-01"
        index={1}
        title={articleSections[0].title}
        body={articleSections[0].body}
        pointsTitle={articleSections[0].pointsTitle}
        points={articleSections[0].points}
        summary={articleSections[0].summary}
        width="default"
      />
      <ArticleSection
        id="metric-02"
        index={2}
        title={articleSections[1].title}
        body={articleSections[1].body}
        pointsTitle={articleSections[1].pointsTitle}
        points={articleSections[1].points}
        note={articleSections[1].note}
        summary={articleSections[1].summary}
        width="default"
      />
      <ArticleSection
        id="metric-03"
        index={3}
        title={articleSections[2].title}
        body={articleSections[2].body}
        pointsTitle={articleSections[2].pointsTitle}
        points={articleSections[2].points}
        summary={articleSections[2].summary}
        width="default"
      />
      <ArticleSection
        id="metric-04"
        index={4}
        title={articleSections[3].title}
        body={articleSections[3].body}
        pointsTitle={articleSections[3].pointsTitle}
        points={articleSections[3].points}
        note={articleSections[3].note}
        summary={articleSections[3].summary}
        width="default"
      />
      <ArticleSection
        id="metric-05"
        index={5}
        title={articleSections[4].title}
        body={articleSections[4].body}
        pointsTitle={articleSections[4].pointsTitle}
        points={articleSections[4].points}
        summary={articleSections[4].summary}
        width="default"
      />

      <MidArticleCTA
        body="如果你正在判断一个美国房地产项目的财务模型，可以先做一次项目初筛。"
        ctaLabel="提交项目初筛"
        ctaHref="/zh/services/strategy/"
      />

      <ArticleSection
        id="metric-06"
        index={6}
        title={articleSections[5].title}
        body={articleSections[5].body}
        pointsTitle={articleSections[5].pointsTitle}
        points={articleSections[5].points}
        summary={articleSections[5].summary}
        width="default"
      />
      <ArticleSection
        id="metric-07"
        index={7}
        title={articleSections[6].title}
        body={articleSections[6].body}
        pointsTitle={articleSections[6].pointsTitle}
        points={articleSections[6].points}
        summary={articleSections[6].summary}
        width="default"
      />
      <ArticleSection
        id="metric-08"
        index={8}
        title={articleSections[7].title}
        body={articleSections[7].body}
        pointsTitle={articleSections[7].pointsTitle}
        points={articleSections[7].points}
        summary={articleSections[7].summary}
        width="default"
      />
      <ArticleSection
        id="metric-09"
        index={9}
        title={articleSections[8].title}
        body={articleSections[8].body}
        pointsTitle={articleSections[8].pointsTitle}
        points={articleSections[8].points}
        summary={articleSections[8].summary}
        width="default"
      />
      <ArticleSection
        id="metric-10"
        index={10}
        title={articleSections[9].title}
        body={articleSections[9].body}
        pointsTitle={articleSections[9].pointsTitle}
        points={articleSections[9].points}
        summary={articleSections[9].summary}
        width="default"
      />

      <SarecFramework
        eyebrow="SAREC FRAMEWORK · 机构方法论"
        title="SAREC 的指标判断框架"
        body={sarecFrameworkBody}
        bottomTag="METRICS ASSESSMENT"
        items={sarecFramework}
      />

      <ArticleSection
        title="真正专业的投资判断，是从数字回到假设"
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
        question="如果你正在看一个美国房地产项目，先不要只看收益数字。"
        intents={conversionIntents}
        contactLine="你可以提交项目测算、项目介绍或合作需求。SAREC 会根据项目阶段、资料完整度和合作可能性，帮助你初步判断关键假设是否值得继续验证。"
      />
    </main>
  );
}
