import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '洛杉矶 ED1 与经济适用房开发观察｜SAREC Insights',
  description:
    '本文从政策背景、审批效率、项目筛选、融资可行性、建设成本、租赁运营、退出路径和风险控制等角度，分析洛杉矶 ED1 与 100% 经济适用房开发项目中的机会与风险。',
  path: '/zh/research/los-angeles-ed1-affordable-housing',
  type: 'article'
});

const tags = ['SAREC Insights', '洛杉矶 ED1', '经济适用房开发', 'Affordable Housing', '项目判断'];

const sections = [
  {
    title: '1. ED1 的核心意义：提高审批效率，但不是替代项目判断',
    body:
      'ED1 的重要意义在于，它为符合条件的 100% 经济适用房项目提供更高效的审批路径。对于洛杉矶这样的高成本、高规则密度城市而言，审批时间本身就是项目成本的一部分。',
    pointsTitle: 'ED1 的价值可能体现在',
    points: ['缩短部分审批周期', '减少部分 discretionary review 的不确定性', '提高土地利用效率', '激活部分原本开发效率较低的地块', '推动开发商重新评估 affordable housing 项目'],
    note: '审批效率提高，不代表项目风险消失。一个项目仍然要面对土地限制、图纸深化、部门协调、融资、施工、运营和退出市场。',
    summary: 'ED1 改变的是审批路径，但项目成败仍取决于完整开发能力。'
  },
  {
    title: '2. 为什么 ED1 会吸引开发商？',
    body:
      '在传统开发模式下，洛杉矶很多项目面临漫长审批、不确定听证、社区阻力和高持有成本。ED1 让部分 100% 经济适用房项目获得更可预期的审批路径，从而改变项目早期可行性判断。',
    pointsTitle: '开发商关注 ED1 的原因',
    points: ['审批周期可能缩短', '土地利用效率可能提高', '项目确定性可能增强', '政策目标与住房供给需求一致', '可形成新的 affordable housing 开发模式'],
    note: '这些优势必须结合具体地块判断。并不是所有土地都适合做 ED1，也不是所有 ED1 项目都有合理经济性。',
    summary: 'ED1 是政策工具，不是项目筛选的替代品。'
  },
  {
    title: '3. 看 ED1 项目，第一步不是看收益，而是看土地是否真正适用',
    body:
      '很多投资人容易先看开发后规模、预计租金、退出价值或项目测算。但 ED1 项目首先要看的是土地条件和政策适用性。',
    pointsTitle: '需要判断',
    points: ['地块是否位于合适的 zoning 和规划条件下', '项目是否符合 100% affordable housing 要求', '是否存在租户保护、历史资源、环境或高火险等限制', '是否涉及单户区、低密度区或其他政策限制', '地块形状、面积、临街条件和公用事业是否支持开发', '是否存在消防、停车、交通、无障碍或公用事业瓶颈', '周边社区和租赁需求是否支持项目定位'],
    summary: 'ED1 的起点不是“能不能多建”，而是“这块地是否真的适合按这个路径推进”。'
  },
  {
    title: '4. 审批加速不等于无审批',
    body:
      'ED1 项目可能在某些环节获得更高效处理，但仍然需要满足设计、建筑、安全、消防、公用事业、环保、租户保护和城市部门要求。',
    pointsTitle: '项目方需要关注',
    points: ['Entitlement 是否真正明确', 'Plan Check 是否完成', 'Corrections 是否已回复', '是否已进入 RTI Ready', 'Permit 是否已经领取', 'Department clearance 是否完整', 'LADBS、LAFD、LADWP 等部门是否仍有未解决事项', '施工图是否足够支持 GC 报价'],
    summary: '审批加速只能降低部分时间和程序不确定性，不能替代技术审查和施工准备。'
  },
  {
    title: '5. 融资：政策支持不等于银行自动贷款',
    body:
      'ED1 项目即使审批路径更清楚，也仍然需要资金结构支持。建筑贷款机构通常会看项目预算、开发商经验、资金来源、担保能力、租金或收入假设、退出路径和市场风险。',
    pointsTitle: '需要判断',
    points: ['建筑贷款是否已有 term sheet 或明确沟通', '贷款机构是否理解 affordable housing 收入结构', '股权资金是否充足', '利息储备是否合理', '项目是否需要额外补贴、税收优惠或其他资金来源', '高利率环境下现金流是否承压', '如果贷款条件变化，项目如何应对'],
    summary: '融资不是政策审批之后才考虑的问题，而是 ED1 项目能否真正落地的关键条件。'
  },
  {
    title: '6. 建设成本：ED1 项目仍然要面对真实施工市场',
    body:
      '无论政策路径多高效，项目最终都要回到施工成本。洛杉矶的人工、材料、保险、结构、消防、公用事业和施工管理成本，都会直接影响项目经济性。',
    pointsTitle: '需要关注',
    points: ['是否有多个 GC 报价', '报价是否基于完整施工图', '是否存在 excluded items', '是否有合理 contingency', '是否考虑 Type I / Type III 等结构成本差异', '是否考虑利息、保险、permit、school fee、linkage fee 等软成本', '工期是否合理', '变更单如何控制'],
    summary: 'ED1 可能压缩审批时间，但不能自动压缩建设成本。'
  },
  {
    title: '7. 100% 经济适用房不是只看单位数，也要看长期运营',
    body:
      'Affordable housing 项目不是建成后就自动稳定。项目还需要考虑租户资格、租金限制、运营成本、管理能力、维护支出、合规记录和长期持有逻辑。',
    pointsTitle: '需要判断',
    points: ['租金限制和收入限制如何影响 NOI', '租户资格审核机制', '物业管理成本', '维修和储备', '保险和税费', '空置率和出租速度', '长期 compliance 要求', '未来出售或再融资时买家如何看这类资产'],
    summary: 'ED1 项目不仅是开发项目，也是长期运营和合规管理项目。'
  },
  {
    title: '8. ED1 项目的退出路径不能过度简化',
    body:
      'ED1 项目可能通过出售、再融资或长期持有实现退出。但具体结果取决于项目收入、租金限制、市场 cap rate、买家需求、融资环境和合规要求。',
    pointsTitle: '需要提前讨论',
    points: ['是建成后出售，还是稳定运营后出售', '是否计划再融资', '退出买家是谁', '买家如何评估 affordable housing 资产', '租金限制是否影响估值', 'cap rate 假设是否合理', '如果市场变差，是否能长期持有', 'LP / GP 如何决定退出'],
    summary: '退出不能只写在模型最后一行，而应该从项目开始时就设计。'
  }
];

const mistakes = [
  '以为 ED1 等于自动批准',
  '以为审批快就等于项目安全',
  '只看单位数增加，不看建设成本',
  '只看政策红利，不看融资可行性',
  '只看地块面积，不看消防、公用事业和技术限制',
  '只看开发价值，不看长期 affordable housing 运营约束',
  '只看退出估值，不看买家和 cap rate',
  '只看项目方介绍，不看完整资料和合作结构'
];

const sarecFramework = [
  '地块是否真正适合 ED1 路径',
  '政策适用性是否清楚',
  '审批阶段是否真实',
  'Plan Check、RTI、Permit 是否有明确进展',
  '公用事业、消防、停车、交通等问题是否解决',
  '建设成本是否有依据',
  '建筑贷款是否可验证',
  '租赁和运营逻辑是否成立',
  '退出路径是否现实',
  'LP / GP 合作结构和信息披露是否清晰'
];

const relatedLinks = [
  { title: '美国房地产开发完整流程', href: '/zh/research/us-real-estate-development-process/' },
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: '案例研究', href: '/zh/case-studies/' },
  { title: '风险披露', href: '/zh/legal/risk-disclosure/' }
];

export default function LosAngelesEd1AffordableHousingPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC Insights</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">洛杉矶 ED1 与经济适用房开发观察</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            ED1 改变了洛杉矶部分 100% 经济适用房项目的审批节奏，也吸引了大量开发商和投资人关注。但政策红利并不等于项目安全，真正的判断仍然要回到土地、分区、审批、融资、建设、运营和退出。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span className="rounded-[2px] border border-white/15 bg-white/5 px-3 py-1.5 font-sans text-xs font-semibold text-zinc-300" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/case-studies/" variant="gold">
              查看案例研究
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
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">政策机会越明显，越需要冷静判断</h2>
          </div>
          <Card className="md:p-10">
            <div className="grid gap-5 text-base leading-8 text-muted md:text-lg md:leading-9">
              <p>洛杉矶长期面临住房供应不足和住房可负担性压力。为了加快住房建设，洛杉矶推出了 ED1 等审批加速工具，重点支持符合条件的 100% 经济适用房项目。</p>
              <p>对项目方而言，ED1 可能改变一个项目的审批效率和土地利用逻辑；对投资人而言，它也可能让原本看起来不具备开发价值的土地，突然出现新的项目可能性。</p>
              <p>
                但 ED1 不是项目成功的保证，也不是融资、施工、出租和退出的替代品。真正专业的判断，是把政策红利放进
                <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/research/us-real-estate-development-process/">
                  完整开发链条
                </Link>
                中，逐项验证项目是否成立。
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <div className="max-w-4xl">
            <p className="font-sans text-sm font-semibold text-gold">Framework</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">从政策工具回到项目判断</h2>
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">
              ED1 后续政策和执行口径可能变化，洛杉矶也在持续推进更广泛的 permitting reform。本文只做一般观察，不构成任何政策承诺。涉及 zoning、entitlement、permit、affordable housing covenant、贷款、税务、法律、证券、EB-5 等事项，应咨询相应专业人士。
            </p>
          </div>
          <div className="mt-10 grid gap-6">
            {sections.map((section) => (
              <Card className="bg-white md:p-9" key={section.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug text-ink md:text-2xl">{section.title}</h3>
                <p className="mt-5 text-base leading-8 text-muted">{section.body}</p>
                {section.note ? <p className="mt-4 rounded-md border border-line bg-zinc-50 p-4 text-sm leading-7 text-muted">{section.note}</p> : null}
                <div className="mt-6 rounded-md border border-line bg-zinc-50 p-5">
                  <p className="font-sans text-sm font-semibold text-ink">{section.pointsTitle}</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted md:grid-cols-2">
                    {section.points.map((point) => (
                      <li className="border-l-2 border-gold pl-4" key={point}>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-5 border-l-2 border-ink pl-4 font-sans text-sm font-semibold leading-7 text-ink">{section.summary}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-2">
          <Card className="md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">Common Mistakes</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">ED1 项目常见的 8 个误区</h2>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
              {mistakes.map((item) => (
                <li className="border-l-2 border-gold pl-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">Case Lens</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">从案例看 ED1：政策机会要落到真实项目推进能力</h2>
            <div className="mt-6 grid gap-4 text-sm leading-7 text-muted md:text-base">
              <p>4136 Rosewood 用于说明精品公寓开发项目如何从土地、审批、成本、融资、租赁和退出进行系统判断。</p>
              <p>3434 Chesapeake 适合说明 ED1 政策下的 RTI Ready、审批效率、土地利用提升和项目推进能力。</p>
              <p>2215 Wellesley 适合说明复杂规划区、Plan Check、公用事业协调、LADWP / LAFD 技术问题和跨部门推进能力。</p>
            </div>
            <div className="mt-8">
              <Button href="/zh/case-studies/" variant="secondary">
                查看案例研究
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">SAREC Framework</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">SAREC 的 ED1 项目判断框架</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              SAREC 不把 ED1 看成简单的政策红利，而是把它放进完整开发链条中判断。我们关注的不只是项目是否符合政策，而是政策能否真正转化为项目推进能力。合作结构也应结合
              <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/research/lp-gp-structure/">
                LP / GP 合作结构
              </Link>
              和
              <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/research/cap-rate-irr-roe/">
                指标假设
              </Link>
              一起判断。
            </p>
          </div>
          <Card className="bg-white md:p-9">
            <ul className="grid gap-3 text-sm leading-7 text-muted md:text-base">
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
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">ED1 带来机会，但真正的价值来自专业判断</h2>
            <div className="mt-6 grid gap-5 text-base leading-8 text-muted">
              <p>ED1 改变了洛杉矶部分 100% 经济适用房项目的审批效率，也为开发商和投资人带来了新的项目观察窗口。但政策本身不能替代项目判断。</p>
              <p>对于中国投资人、美国华人投资人和项目方而言，真正重要的是看懂：这个项目是否符合政策，审批是否真实推进，融资是否可落实，建设成本是否可控，运营和退出是否可验证，合作结构是否清楚。</p>
              <p>SAREC 希望帮助跨境客户把政策机会转化为可讨论、可验证、可推进的项目判断，而不是只停留在政策红利想象中。</p>
            </div>
          </Card>
          <Card className="border-gold/40 md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">重要说明</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">重要说明</h2>
            <p className="mt-6 text-base leading-8 text-muted">
              本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。ED1、经济适用房、房地产开发、项目投资、融资、税务、保险、法律和跨境交易均涉及复杂风险。具体事项应结合最新政策、项目资料、合同文件和相关持牌或专业人士意见审慎判断。
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
            <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如果你正在判断一个 ED1 或经济适用房开发项目，可以先从项目阶段和资料完整度开始。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
              你可以提交项目地址、图纸、审批状态、RTI / Permit 进展、预算或合作需求。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。
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
