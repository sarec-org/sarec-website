import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import { ArticleHero } from '@/components/sections/research/ArticleHero';
import { ArticleSection } from '@/components/sections/research/ArticleSection';
import { RelatedResearch } from '@/components/sections/research/RelatedResearch';
import { OpeningJudgment } from '@/components/sections/research/OpeningJudgment';
import { ResearchMap } from '@/components/sections/research/ResearchMap';
import { RiskLedger } from '@/components/sections/research/RiskLedger';
import { SarecFramework } from '@/components/sections/research/SarecFramework';
import { MidArticleCTA } from '@/components/sections/research/MidArticleCTA';
import { ConversionBlock } from '@/components/sections/research/ConversionBlock';

export const metadata: Metadata = createPageMetadata({
  title: '美国房地产开发完整流程｜SAREC Insights',
  description:
    '本文系统介绍美国房地产开发从土地筛选、可行性分析、entitlement、permit、融资、设计、施工、出租、出售、再融资到退出的完整流程，帮助中国投资人和美国华人投资人理解项目开发背后的关键环节与风险。',
  path: '/zh/research/us-real-estate-development-process',
  type: 'article'
});

const tags = ['SAREC Insights', '美国房地产开发', '项目判断', '开发流程', '风险控制'];

const uncertainties = [
  '土地是否适合开发',
  '分区和政策是否支持',
  '审批路径是否清楚',
  '成本预算是否合理',
  '融资是否可落实',
  '市场需求是否真实',
  '合作结构是否稳健',
  '退出路径是否可验证'
];

const processStages = [
  {
    title: '1. 土地筛选：一个项目的命运，往往从拿地前就已经决定',
    body:
      '土地是房地产开发的起点，也是很多项目风险的源头。投资人不能只看土地价格便宜，也不能只看建成后可能卖多少钱。真正重要的是这块地是否适合开发、能开发什么、多久能开发、以什么成本开发、最终产品有没有市场。',
    pointsTitle: '需要判断',
    points: ['土地位置和社区环境', '当前 zoning 和可开发强度', '是否存在特殊规划区、历史资源、环保限制或社区限制', '地块面积、形状、坡度、临街条件和出入口', '公用事业接入条件', '周边竞品和目标客群', '土地价格是否已经透支开发利润', '项目是否需要拆迁、改造或额外协调'],
    note: '中国投资人常见误区：看到土地便宜，就认为项目有利润；看到周边房价高，就认为开发一定能赚钱。',
    summary: '土地便宜不等于项目安全，土地贵也不一定没有机会，关键是土地条件能否支撑开发逻辑。'
  },
  {
    title: '2. 可行性分析：先验证项目是否值得继续推进',
    body:
      '可行性分析不是做一张漂亮的收益表，而是用多个维度验证项目是否成立。一个项目至少要同时通过市场、政策、成本、融资、产品和退出几个层面的初步判断。',
    pointsTitle: '可行性分析应包括',
    points: ['市场需求分析', '租金或售价比较', '建设成本初估', '软成本估算', '审批路径判断', '融资可得性判断', '项目周期预测', '退出方式比较', '风险敏感性分析'],
    note: '如果一个项目只有乐观版本测算，没有保守情景、压力测试和风险预案，就不应该急着推进。',
    summary: '可行性分析的目的不是证明项目一定好，而是找出项目可能不成立的地方。'
  },
  {
    title: '3. Entitlement：项目从"想法"变成"权利"的关键阶段',
    body:
      'Entitlement 通常指项目获得土地使用、规划条件、开发强度或特定用途许可的过程。不同城市、不同项目类型、不同政策路径，entitlement 的复杂程度差异很大。',
    pointsTitle: '这个阶段要关注',
    points: ['项目是否符合 zoning', '是否需要 density bonus、variance、conditional use permit 或其他特殊申请', '是否涉及社区听证或公共审议', '是否需要环境评估', '是否涉及 affordable housing、ED1 或其他政策条件', '是否存在消防、交通、停车、公用事业等限制', '主管部门是否已有明确反馈'],
    note: '政策支持型项目不等于自动通过。即使某些政策可以提高审批效率，具体项目仍需要满足适用条件、图纸要求和部门审查。',
    summary: 'Entitlement 是判断项目真实性的重要节点。没有清晰权利路径的项目，不能只靠概念测算推进。'
  },
  {
    title: '4. 设计深化与 Plan Check：图纸细节会影响成本、工期和许可',
    body:
      '进入设计深化后，项目要从概念方案进入可以审查、可以报价、可以施工的图纸体系。这个阶段通常涉及建筑师、结构工程师、MEP 工程师、土木工程师、地质、测量、消防、公用事业等专业协同。',
    pointsTitle: 'Plan Check 阶段常见问题',
    points: ['图纸是否满足 Building and Safety 要求', '消防通道和 egress 是否合规', '结构系统是否合理', '水电气接入是否可行', '停车、垃圾、景观、无障碍要求是否满足', '公用事业部门是否有额外条件', '图纸修改是否导致成本变化'],
    summary: '图纸不是形式文件，Plan Check 中的每一次修改，都可能影响项目成本和时间表。'
  },
  {
    title: '5. Permit 与 RTI：能不能开工，要看许可是否真正就绪',
    body:
      '很多投资人听到"项目快批了""马上开工"，容易误以为风险已经消失。实际上，项目是否可以真正进入施工，要看 Permit 状态、费用缴纳、部门 clearance、承包商准备、融资和保险等条件是否都满足。',
    pointsTitle: '需要区分',
    points: ['Entitlement 已通过', 'Plan Check 进行中', 'Corrections 待回复', 'RTI Ready', 'Permit 已领取', '已完成开工前准备'],
    note: 'RTI Ready 说明许可已接近可以领取，但实际开工仍可能受到融资、合同、保险、施工准备和市场条件影响。',
    summary: '"接近开工"和"可以开工"不是同一件事。'
  },
  {
    title: '6. 融资安排：开发项目不是只有股权，还需要贷款和资金节奏',
    body:
      '房地产开发通常需要股权资金、建筑贷款、过桥贷款、优先资金、夹层资金或其他资本安排。投资人需要看清资金从哪里来、什么时候到位、谁承担资金缺口、贷款条件是否现实。',
    pointsTitle: '需要关注',
    points: ['土地资金是否已经落实', '前期软成本由谁承担', '建筑贷款是否有 term sheet 或正式承诺', '贷款比例、利率、费用和放款条件', '是否需要 completion guarantee 或 personal guarantee', '成本超支如何处理', '利息储备是否充分', '再融资或退出是否依赖特定市场条件'],
    summary: '融资不是项目后期问题，而是项目能否推进的核心条件。'
  },
  {
    title: '7. GC 招标与施工合同：成本控制从选择总承包商开始',
    body:
      '总承包商选择会直接影响项目成本、工期、质量和风险。投资人不能只看最低报价，也要看报价范围、排除项、工期、履约能力、过往项目、保险、担保和变更机制。',
    pointsTitle: '需要关注',
    points: ['是否有多个 GC 报价', '报价是否基于完整图纸', '是否存在 exclusions', '是否是 fixed price、cost plus 或 GMP', 'change order 如何审批', '工期和延误责任', '付款节点和保留金', '保险和履约能力', '是否有关联方交易'],
    summary: '低报价不一定是低成本。真正重要的是合同范围和风险分配是否清楚。'
  },
  {
    title: '8. 施工管理：开发利润常常在施工阶段被消耗',
    body:
      '施工阶段是项目从纸面进入现实的阶段，也是风险最集中的阶段之一。延期、变更、材料涨价、劳工问题、检查延误、天气、现场条件变化，都可能影响项目结果。',
    pointsTitle: '需要管理',
    points: ['施工进度', '预算执行', 'change order', '质量控制', '政府检查', '贷款放款节点', '承包商付款', '现场安全', '投资人报告'],
    summary: '施工阶段不是"等着建完"，而是需要持续管理、持续披露、持续纠偏。'
  },
  {
    title: '9. 运营准备：建成不代表项目完成',
    body:
      '房地产项目建成后，还需要进入出租、销售、运营或再融资阶段。不同项目类型的运营逻辑不同，公寓项目看出租和运营，出售型项目看销售速度和买家需求，商业项目看租约质量和租户信用。',
    pointsTitle: '需要提前准备',
    points: ['租赁策略', '定价策略', '物业管理', '营销渠道', '运营成本', '维修和储备', '空置率假设', '租户筛选', '销售或再融资材料'],
    summary: '项目价值不是建成那一刻自动实现，而是在运营和市场接受中被验证。'
  },
  {
    title: '10. 退出路径：项目价值最终要通过退出或持有来实现',
    body:
      '开发项目常见退出路径包括出售、再融资和长期持有。每种路径都受市场、利率、cap rate、租金、买家需求、贷款条件和税务安排影响。',
    pointsTitle: '需要提前讨论',
    points: ['是建成出售，还是稳定出租后出售', '是否计划再融资', '再融资现金如何分配', '如果市场不好，是否长期持有', '谁决定退出时间', '是否有最低出售条件', 'LP / GP 如何参与退出决策', '税务影响如何处理'],
    summary: '退出不是最后一步才考虑，而应该从项目开始时就设计。'
  }
];

const commonMistakes = [
  '只看土地价格，不看开发条件',
  '只看收益测算，不看审批路径',
  '只看项目规模，不看融资可行性',
  '只看大区位，不看微区位',
  '只看建成价值，不看时间成本',
  '只看项目方介绍，不看合同和报告机制',
  '只看退出价格，不看市场周期',
  '只看机会，不看谁负责、谁决策、谁披露信息'
];

const sarecFramework = [
  '土地是否支持项目逻辑',
  '审批路径是否清楚',
  '成本预算是否有依据',
  '融资安排是否可验证',
  '市场需求是否真实',
  '施工和管理能力是否匹配',
  '运营和退出路径是否合理',
  'LP / GP 合作结构是否清晰',
  '信息披露机制是否建立',
  '是否需要律师、会计师、贷款机构、保险顾问或其他专业人士参与'
];

const relatedLinks = [
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: 'LP / GP 合作结构详解', href: '/zh/research/lp-gp-structure/' },
  { title: '项目判断框架', href: '/zh/research/framework/' },
  { title: '案例研究', href: '/zh/case-studies/' }
];

const introParagraphs = [
  '很多中国投资人和新移民第一次接触美国房地产开发项目时，容易把开发理解为一个简单流程：买一块地，设计图纸，拿到许可，开始施工，建成后出租或出售。',
  '但真实的美国房地产开发远比这复杂。一个项目能否成立，往往不是由单一因素决定，而是由土地条件、城市政策、分区规则、审批路径、设计方案、建设成本、贷款条件、市场需求、运营假设和退出环境共同决定。',
  '美国房地产市场相对规则清晰，但规则清晰并不等于项目简单。真正专业的判断，是在项目早期就把关键问题拆开，看清楚每一步的条件、风险和责任边界。相关风险背景也可以结合中国投资人美国房地产常见风险理解。'
];

const developmentLogicBody =
  '房地产开发不是简单购买已有资产，而是一个不断降低不确定性的过程。项目早期不确定性最高；随着项目推进，部分不确定性会被消除，但新的风险也会出现。一个成熟的开发团队和投资判断体系，必须持续追踪这些变化。';

const sarecFrameworkBody =
  'SAREC 不把房地产开发看成单一项目展示，而是把它拆解为土地、审批、成本、融资、建设、运营、退出和合作结构。每一个环节都需要提出正确问题，才能判断项目是否值得继续推进。具体合作结构也可以结合 LP / GP 合作结构详解继续理解。';

const conclusionParagraphs = [
  '美国房地产开发并不是一个简单的线性流程。它更像是一套不断验证、不断调整、不断降低不确定性的系统工程。土地、审批、融资、建设、运营和退出之间相互影响，任何一个环节的误判，都可能改变项目结果。',
  '对中国投资人和美国华人投资人而言，真正重要的不是听到一个项目机会，而是看懂这个项目处在什么阶段、还缺什么条件、哪些风险没有解决、合作结构是否清晰、退出路径是否现实。',
  'SAREC 希望帮助客户在美国房地产项目中，先建立判断能力，再讨论合作机会。更多真实项目判断方式，可以查看 SAREC 的案例研究。'
];

const noticeBody =
  '本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。美国房地产开发、项目投资、融资、税务、保险、法律和跨境交易均涉及复杂风险。具体事项应结合项目资料、合同文件和相关持牌或专业人士意见审慎判断。';

const researchMapKeywords = [
  { keyword: '土地筛选', anchor: 'stage-01' },
  { keyword: '可行性分析', anchor: 'stage-02' },
  { keyword: 'Entitlement', anchor: 'stage-03' },
  { keyword: '设计 / Plan Check', anchor: 'stage-04' },
  { keyword: 'Permit / RTI', anchor: 'stage-05' },
  { keyword: '融资安排', anchor: 'stage-06' },
  { keyword: 'GC 招标', anchor: 'stage-07' },
  { keyword: '施工管理', anchor: 'stage-08' },
  { keyword: '运营准备', anchor: 'stage-09' },
  { keyword: '退出路径', anchor: 'stage-10' }
];

const researchMapItems = researchMapKeywords.map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: processStages[i].title
}));

const heroAnchors = researchMapKeywords.slice(0, 3).map((k, i) => ({
  keyword: k.keyword,
  anchor: k.anchor,
  fullTitle: processStages[i].title
}));

const conversionIntents = [
  { label: '你有具体项目', ctaText: '提交项目初筛', href: '/zh/services/strategy/' },
  { label: '你想继续研究', ctaText: '返回研究中心', href: '/zh/research' },
  { label: '你想保持联系', ctaText: '联系我们', href: '/zh/contact/' }
];

export default function UsRealEstateDevelopmentProcessPage() {
  return (
    <main style={{ background: 'var(--ink-deepest)', color: 'var(--ivory)' }}>
      <ArticleHero
        eyebrow="SAREC INSIGHTS · 开发完整流程"
        title="美国房地产开发完整流程"
        summary={`从一块土地到一个可出租、可出售、可再融资的项目，美国房地产开发不是简单的"买地、盖楼、卖掉"，而是一套由土地、审批、融资、设计、施工、运营、退出和合作结构共同决定的系统工程。`}
        tags={tags}
        heroVideo={{
          src: '/videos/research/us-real-estate-development-process-hero.mp4',
          poster: '/images/research/us-real-estate-development-process-poster.jpg'
        }}
        primaryCta={{ label: '查看项目判断框架', href: '/zh/research/framework/' }}
        secondaryCta={{ label: '提交项目初筛', href: '/zh/services/strategy/' }}
        anchors={heroAnchors}
        mediaCaption="DEVELOPMENT PROCESS / APPROVALS / CONSTRUCTION"
      />

      <OpeningJudgment
        judgment="开发不是线性动作，而是系统判断"
        introParagraphs={introParagraphs}
      />

      <ResearchMap
        eyebrow="RESEARCH MAP · 本文导读"
        title="十个阶段,从土地到退出"
        items={researchMapItems}
      />

      <ArticleSection
        title="房地产开发的本质：把不确定性逐步转化为确定性"
        body={developmentLogicBody}
        pointsTitle="关键不确定性包括"
        points={uncertainties}
        summary="房地产开发不是一次性判断，而是阶段性验证。"
        width="default"
      />

      <ArticleSection
        id="stage-01"
        index={1}
        title={processStages[0].title}
        body={processStages[0].body}
        pointsTitle={processStages[0].pointsTitle}
        points={processStages[0].points}
        note={processStages[0].note}
        summary={processStages[0].summary}
        width="default"
      />
      <ArticleSection
        id="stage-02"
        index={2}
        title={processStages[1].title}
        body={processStages[1].body}
        pointsTitle={processStages[1].pointsTitle}
        points={processStages[1].points}
        note={processStages[1].note}
        summary={processStages[1].summary}
        width="default"
      />
      <ArticleSection
        id="stage-03"
        index={3}
        title={processStages[2].title}
        body={processStages[2].body}
        pointsTitle={processStages[2].pointsTitle}
        points={processStages[2].points}
        note={processStages[2].note}
        summary={processStages[2].summary}
        width="default"
      />
      <ArticleSection
        id="stage-04"
        index={4}
        title={processStages[3].title}
        body={processStages[3].body}
        pointsTitle={processStages[3].pointsTitle}
        points={processStages[3].points}
        summary={processStages[3].summary}
        width="default"
      />
      <ArticleSection
        id="stage-05"
        index={5}
        title={processStages[4].title}
        body={processStages[4].body}
        pointsTitle={processStages[4].pointsTitle}
        points={processStages[4].points}
        note={processStages[4].note}
        summary={processStages[4].summary}
        width="default"
      />

      <MidArticleCTA
        body="如果你正在判断一个美国房地产开发项目，可以先从项目阶段和资料完整度开始。"
        ctaLabel="提交项目初筛"
        ctaHref="/zh/services/strategy/"
      />

      <ArticleSection
        id="stage-06"
        index={6}
        title={processStages[5].title}
        body={processStages[5].body}
        pointsTitle={processStages[5].pointsTitle}
        points={processStages[5].points}
        summary={processStages[5].summary}
        width="default"
      />
      <ArticleSection
        id="stage-07"
        index={7}
        title={processStages[6].title}
        body={processStages[6].body}
        pointsTitle={processStages[6].pointsTitle}
        points={processStages[6].points}
        summary={processStages[6].summary}
        width="default"
      />
      <ArticleSection
        id="stage-08"
        index={8}
        title={processStages[7].title}
        body={processStages[7].body}
        pointsTitle={processStages[7].pointsTitle}
        points={processStages[7].points}
        summary={processStages[7].summary}
        width="default"
      />
      <ArticleSection
        id="stage-09"
        index={9}
        title={processStages[8].title}
        body={processStages[8].body}
        pointsTitle={processStages[8].pointsTitle}
        points={processStages[8].points}
        summary={processStages[8].summary}
        width="default"
      />
      <ArticleSection
        id="stage-10"
        index={10}
        title={processStages[9].title}
        body={processStages[9].body}
        pointsTitle={processStages[9].pointsTitle}
        points={processStages[9].points}
        summary={processStages[9].summary}
        width="default"
      />

      <RiskLedger
        eyebrow="RISK LEDGER · 常见误区"
        title="中国投资人常见的 8 个误区"
        items={commonMistakes}
      />

      <SarecFramework
        eyebrow="SAREC FRAMEWORK · 机构方法论"
        title="SAREC 的开发项目判断框架"
        body={sarecFrameworkBody}
        bottomTag="DEVELOPMENT ASSESSMENT"
        items={sarecFramework}
      />

      <ArticleSection
        title="美国房地产开发，看的是流程，更看的是判断能力"
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
        question="如果你正在判断一个美国房地产开发项目，可以先从流程和阶段开始梳理。"
        intents={conversionIntents}
        contactLine="你可以提交项目资料、图纸、审批状态、融资计划或项目介绍。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。"
      />
    </main>
  );
}
