import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

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
    title: '3. Entitlement：项目从“想法”变成“权利”的关键阶段',
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
      '很多投资人听到“项目快批了”“马上开工”，容易误以为风险已经消失。实际上，项目是否可以真正进入施工，要看 Permit 状态、费用缴纳、部门 clearance、承包商准备、融资和保险等条件是否都满足。',
    pointsTitle: '需要区分',
    points: ['Entitlement 已通过', 'Plan Check 进行中', 'Corrections 待回复', 'RTI Ready', 'Permit 已领取', '已完成开工前准备'],
    note: 'RTI Ready 说明许可已接近可以领取，但实际开工仍可能受到融资、合同、保险、施工准备和市场条件影响。',
    summary: '“接近开工”和“可以开工”不是同一件事。'
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
    summary: '施工阶段不是“等着建完”，而是需要持续管理、持续披露、持续纠偏。'
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

export default function UsRealEstateDevelopmentProcessPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC Insights</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">美国房地产开发完整流程</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            从一块土地到一个可出租、可出售、可再融资的项目，美国房地产开发不是简单的“买地、盖楼、卖掉”，而是一套由土地、审批、融资、设计、施工、运营、退出和合作结构共同决定的系统工程。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span className="rounded-[2px] border border-white/15 bg-white/5 px-3 py-1.5 font-sans text-xs font-semibold text-zinc-300" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/research/framework/" variant="gold">
              查看项目判断框架
            </Button>
            <Button href="/zh/services/strategy/" variant="light">
              提交项目初筛
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Introduction</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">开发不是线性动作，而是系统判断</h2>
          </div>
          <Card className="md:p-10">
            <div className="grid gap-5 text-base leading-8 text-muted md:text-lg md:leading-9">
              <p>很多中国投资人和新移民第一次接触美国房地产开发项目时，容易把开发理解为一个简单流程：买一块地，设计图纸，拿到许可，开始施工，建成后出租或出售。</p>
              <p>但真实的美国房地产开发远比这复杂。一个项目能否成立，往往不是由单一因素决定，而是由土地条件、城市政策、分区规则、审批路径、设计方案、建设成本、贷款条件、市场需求、运营假设和退出环境共同决定。</p>
              <p>
                美国房地产市场相对规则清晰，但规则清晰并不等于项目简单。真正专业的判断，是在项目早期就把关键问题拆开，看清楚每一步的条件、风险和责任边界。相关风险背景也可以结合
                <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/research/chinese-investors-us-real-estate-risks/">
                  中国投资人美国房地产常见风险
                </Link>
                理解。
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Development Logic</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">房地产开发的本质：把不确定性逐步转化为确定性</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              房地产开发不是简单购买已有资产，而是一个不断降低不确定性的过程。项目早期不确定性最高；随着项目推进，部分不确定性会被消除，但新的风险也会出现。一个成熟的开发团队和投资判断体系，必须持续追踪这些变化。
            </p>
          </div>
          <Card className="bg-white md:p-9">
            <p className="font-sans text-sm font-semibold text-ink">关键不确定性包括</p>
            <ul className="mt-4 grid gap-3 text-sm leading-7 text-muted md:text-base">
              {uncertainties.map((item) => (
                <li className="border-l-2 border-gold pl-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-l-2 border-ink pl-4 font-sans text-sm font-semibold leading-7 text-ink">房地产开发不是一次性判断，而是阶段性验证。</p>
          </Card>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <div className="max-w-4xl">
            <p className="font-sans text-sm font-semibold text-gold">Process</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">从土地判断到建成退出的十个阶段</h2>
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">
              不同城市、项目类型、政策环境、融资条件会让开发路径出现差异。以下流程用于建立一般性判断框架，不代表任何项目只要按流程推进就一定成功。涉及建筑许可、法律、税务、贷款、保险和投资结构等事项，应咨询相应持牌或专业人士。
            </p>
          </div>
          <div className="mt-10 grid gap-6">
            {processStages.map((stage) => (
              <Card className="md:p-9" key={stage.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug text-ink md:text-2xl">{stage.title}</h3>
                <p className="mt-5 text-base leading-8 text-muted">{stage.body}</p>
                {stage.note ? <p className="mt-4 rounded-md border border-line bg-zinc-50 p-4 text-sm leading-7 text-muted">{stage.note}</p> : null}
                <div className="mt-6 rounded-md border border-line bg-zinc-50 p-5">
                  <p className="font-sans text-sm font-semibold text-ink">{stage.pointsTitle}</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted md:grid-cols-2">
                    {stage.points.map((point) => (
                      <li className="border-l-2 border-gold pl-4" key={point}>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-5 border-l-2 border-ink pl-4 font-sans text-sm font-semibold leading-7 text-ink">{stage.summary}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-2">
          <Card className="bg-white md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">Common Mistakes</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">中国投资人常见的 8 个误区</h2>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
              {commonMistakes.map((item) => (
                <li className="border-l-2 border-gold pl-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="bg-white md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">SAREC Framework</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">SAREC 的开发项目判断框架</h2>
            <p className="mt-5 text-base leading-8 text-muted">
              SAREC 不把房地产开发看成单一项目展示，而是把它拆解为土地、审批、成本、融资、建设、运营、退出和合作结构。每一个环节都需要提出正确问题，才能判断项目是否值得继续推进。具体合作结构也可以结合
              <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/research/lp-gp-structure/">
                LP / GP 合作结构详解
              </Link>
              继续理解。
            </p>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted">
              {sarecFramework.map((item) => (
                <li className="border-l-2 border-gold pl-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-2">
          <Card className="md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">Conclusion</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">美国房地产开发，看的是流程，更看的是判断能力</h2>
            <div className="mt-6 grid gap-5 text-base leading-8 text-muted">
              <p>美国房地产开发并不是一个简单的线性流程。它更像是一套不断验证、不断调整、不断降低不确定性的系统工程。土地、审批、融资、建设、运营和退出之间相互影响，任何一个环节的误判，都可能改变项目结果。</p>
              <p>对中国投资人和美国华人投资人而言，真正重要的不是听到一个项目机会，而是看懂这个项目处在什么阶段、还缺什么条件、哪些风险没有解决、合作结构是否清晰、退出路径是否现实。</p>
              <p>SAREC 希望帮助客户在美国房地产项目中，先建立判断能力，再讨论合作机会。更多真实项目判断方式，可以查看 SAREC 的
                <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/case-studies/">
                  案例研究
                </Link>
                。
              </p>
            </div>
          </Card>
          <Card className="border-gold/40 md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">重要说明</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">重要说明</h2>
            <p className="mt-6 text-base leading-8 text-muted">
              本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。美国房地产开发、项目投资、融资、税务、保险、法律和跨境交易均涉及复杂风险。具体事项应结合项目资料、合同文件和相关持牌或专业人士意见审慎判断。
            </p>
            <div className="mt-8">
              <Button href="/zh/legal/risk-disclosure/" variant="secondary">
                查看风险披露
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <div className="max-w-4xl">
            <p className="font-sans text-sm font-semibold text-gold">Related</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">相关入口</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {relatedLinks.map((item) => (
              <Link className="group block rounded-md border border-line bg-white p-5 shadow-soft transition duration-150 hover:-translate-y-0.5 hover:border-zinc-400 md:p-6" href={item.href} key={item.href}>
                <h3 className="font-sans text-lg font-semibold leading-snug text-ink group-hover:text-gold">{item.title}</h3>
                <span className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink group-hover:text-gold">前往查看</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-deep py-12 text-white md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如果你正在判断一个美国房地产开发项目，可以先从流程和阶段开始梳理。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
              你可以提交项目资料、图纸、审批状态、融资计划或项目介绍。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Button href="/zh/services/strategy/" variant="light">
              提交项目初筛
            </Button>
            <Button href="/zh/contact/" variant="gold">
              联系我们
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
