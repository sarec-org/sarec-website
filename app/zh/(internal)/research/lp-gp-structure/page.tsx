import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'LP / GP 合作结构详解｜SAREC Insights',
  description:
    '本文从 LP 与 GP 的角色分工、资金进入方式、管理权、信息披露、重大事项决策、费用机制、利润分配、退出安排和风险控制等角度，解释美国房地产项目合作结构中投资人应该重点关注的问题。',
  path: '/zh/research/lp-gp-structure',
  type: 'article'
});

const tags = ['SAREC Insights', 'LP / GP', '合作结构', '投资人保护', '房地产项目判断'];

const sections = [
  {
    title: '1. LP 和 GP：一个负责出资，一个负责管理，但现实远比这句话复杂',
    body:
      '在很多房地产项目合作中，LP 通常指有限合伙人，主要提供资金，参与项目收益分配，但不直接负责日常管理。GP 通常指普通合伙人或管理方，负责项目发起、管理、执行、融资协调、建设推进、资产运营和退出安排。但投资人不能只停留在“LP 出钱、GP 干活”这句话上。',
    pointsTitle: '需要进一步看',
    points: ['GP 是否真正具备项目管理能力', 'GP 是否有足够自身利益绑定', 'LP 是否有基本信息权和监督权', '重大事项是否需要 LP 或投资人同意', 'GP 的费用、分成和权力边界是否清楚', '项目失败、延期、超支时责任如何分配'],
    summary: 'LP / GP 结构的核心不是名称，而是权责、信息和利益是否匹配。'
  },
  {
    title: '2. 为什么房地产项目常用 LP / GP 结构？',
    body:
      '房地产项目通常需要土地、审批、融资、建设、运营、出租、出售等多个环节。普通投资人很难直接参与日常管理，因此项目往往需要一个负责执行的管理方。',
    pointsTitle: '结构优势',
    points: ['让有资金的投资人参与项目', '让有经验的管理方负责执行', '将资金、项目、资源和管理能力组合起来', '通过合伙协议明确各方权利义务', '通过收益分配机制绑定管理方和投资人的利益'],
    risk:
      '如果 GP 能力不足、信息披露不足、费用机制不清、重大事项没有约束，LP 可能处于非常被动的位置。',
    summary: 'LP / GP 结构本身不是风险，结构设计不清才是风险。'
  },
  {
    title: '3. 谁是真正的 GP？不要只看名义角色',
    body:
      '在一些项目中，文件上可能有 GP、Managing Member、Sponsor、Developer、Manager、Operator 等不同角色。投资人需要搞清楚，谁才是真正控制项目推进的人。',
    pointsTitle: '需要问',
    points: ['谁负责拿地和项目发起', '谁负责审批和 permit', '谁负责建筑贷款', '谁负责选择总承包商', '谁负责日常项目管理', '谁负责财务报表和信息披露', '谁决定出售、再融资或长期持有', '谁在项目中承担经济风险'],
    summary: '项目合作中最怕的是名义上有人负责，实际上权责分散、责任不清。'
  },
  {
    title: '4. 资金路径：投资人必须知道钱进入哪里、如何使用、如何监督',
    body:
      '投资人不能只问“投多少钱”，还要问资金进入什么主体、由谁控制、如何使用、是否有预算、是否有账户管理和信息披露。',
    pointsTitle: '需要关注',
    points: ['投资人资金进入 LLC、LP、项目公司还是其他主体', '是否有 Operating Agreement、Limited Partnership Agreement 或 Subscription Agreement', '资金是否用于土地、软成本、硬成本、利息储备、运营费用或其他支出', '是否有预算表和资金使用计划', '是否有第三方托管、账户监管或审批机制', '超预算时如何追加资金', '未使用资金如何处理', '项目退出后资金如何分配'],
    summary: '资金路径不清晰，是跨境投资人最容易忽略但最关键的风险之一。'
  },
  {
    title: '5. 谁有决策权？重大事项不能完全靠口头信任',
    body:
      '在房地产项目中，日常管理可以由 GP 执行，但重大事项应有清晰机制。否则投资人只能在事后知道结果，无法参与关键风险判断。',
    pointsTitle: '重大事项可能包括',
    points: ['增加项目预算', '追加投资人资金', '变更融资结构', '更换总承包商', '出售项目', '再融资', '修改项目用途或产品定位', '接受重大诉讼或和解', '延长项目周期', '关联方交易'],
    risk:
      '需要判断这些事项是否需要 LP 同意，需要多数同意还是特别同意，GP 是否可以单独决定，以及投资人不同意时是否有退出或保护机制。',
    summary: '投资人保护不是靠相信某个人，而是靠清晰的重大事项机制。'
  },
  {
    title: '6. 信息披露：投资人不能只在出问题时才知道项目情况',
    body:
      '很多房地产合作问题，不是项目一开始就坏，而是信息长期不透明。投资人不知道审批是否延迟、贷款是否变化、成本是否上升、施工是否滞后，直到问题很大才发现。',
    pointsTitle: '建议关注的信息披露',
    points: ['月度或季度项目进度', '资金使用情况', '预算与实际支出对比', '审批和 permit 进展', '建筑贷款进展', '施工进度', '租赁或销售进展', '重大风险提示', '年度财务报告', '必要时召开投资人会议'],
    summary: '透明的信息披露，是跨境投资建立信任的基础。'
  },
  {
    title: '7. 费用机制：管理费、开发费、顾问费、佣金和分成要分清',
    body:
      '房地产项目中可能出现多种费用，包括管理费、开发费、项目管理费、融资顾问费、销售佣金、资产管理费、利润分成等。费用本身不是问题，问题是费用是否透明、是否合理、是否和项目结果匹配。',
    pointsTitle: '需要看',
    points: ['GP 是否收管理费', '是否收开发管理费', '是否收项目推荐费或顾问费', '是否存在关联方施工、设计、贷款或销售安排', '费用是否在投资前披露', '费用是固定收取，还是与项目结果挂钩', 'GP 是否同时拿费用和利润分成', 'LP 是否知道所有费用来源和计算方式'],
    summary: '费用不透明，会把原本看起来不错的项目收益结构大幅改变。'
  },
  {
    title: '8. 利润如何分配？先看顺序，再看比例',
    body:
      '很多投资人只看“分成比例”，但更重要的是利润分配顺序。房地产合作中常见 waterfall 机制，即不同收益阶段按照不同规则分配。这里不讨论任何固定模式，因为具体安排必须结合项目文件、合同文本和专业意见判断。',
    pointsTitle: '需要关注',
    points: ['LP 是否先收回本金', '是否有 preferred return', 'preferred return 是否累积', 'GP 什么时候开始参与超额收益分成', '是否有 catch-up 机制', '项目亏损时如何承担', '税务分配和现金分配是否一致', '再融资现金如何分配', '出售时如何清算'],
    summary: '利润分配不是只看百分比，而是要看本金、优先回报、超额分成和清算顺序。'
  },
  {
    title: '9. 项目超支怎么办？这是合作结构中的压力测试',
    body:
      '房地产开发最常见的问题之一是成本增加、工期延长或融资条件变化。如果项目需要追加资金，合作结构必须提前说明。',
    pointsTitle: '需要问',
    points: ['谁有权决定追加资金', 'LP 是否必须追加', '不追加是否会被稀释', 'GP 是否需要同步追加', '是否可以引入新资金', '新资金是否优先于原投资人', '超支原因由谁解释', '是否有预算控制和审批机制'],
    summary: '真正稳健的结构，应该在项目出问题前就写清楚出问题时怎么办。'
  },
  {
    title: '10. 退出机制：项目完成后怎么退出，不能只靠一句“卖掉”',
    body:
      '房地产项目常见退出方式包括出售、再融资、长期持有和分阶段退出。不同退出方式对应不同风险。',
    pointsTitle: '需要关注',
    points: ['谁决定出售', '是否有最低出售条件', '是否可以长期持有', '再融资现金如何分配', '如果市场不好，是否可以延长持有', 'LP 是否有退出权', 'GP 是否可以单方面决定退出', '出售给关联方是否有限制', '税务影响是否提前考虑'],
    summary: '退出不是项目最后才考虑的问题，而应该在合作开始前就讨论清楚。'
  },
  {
    title: '11. 跨境投资人还要多看一层风险',
    body:
      '中国投资人和美国华人投资人参与美国房地产项目，还会遇到一些额外问题。跨境项目不是多一个翻译就够了，而是需要完整的专业协同。',
    pointsTitle: '额外问题',
    points: ['英文合同理解难度', '美国法律和税务制度差异', '资金跨境路径', '汇率变化', '美国本地信用和融资资格', '投资人身份和税务居民身份', '是否涉及证券规则', '是否涉及 EB-5 或移民安排', '是否需要律师、会计师、税务顾问和移民律师参与'],
    summary: '跨境项目不是多一个翻译就够了，而是需要完整的专业协同。'
  }
];

const sarecFocus = [
  '项目主体结构是否清楚',
  'GP 的角色、能力和经济绑定',
  'LP 的权利和信息获取机制',
  '资金进入路径和使用范围',
  '管理费、顾问费、开发费和分成机制',
  '重大事项决策机制',
  '超支、延期和融资变化时的处理方式',
  '信息披露频率和报告机制',
  '退出路径和清算顺序',
  '是否需要律师、会计师、贷款机构、保险顾问或其他专业人士参与'
];

const relatedLinks = [
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: '风险披露', href: '/zh/legal/risk-disclosure/' },
  { title: '项目初筛服务', href: '/zh/services/strategy/' },
  { title: '服务架构', href: '/zh/services/' }
];

export default function LpGpStructurePage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC Insights</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">LP / GP 合作结构详解</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            美国房地产项目中，投资人真正需要看懂的不只是项目本身，还包括谁管理项目、资金如何进入、信息如何披露、重大事项如何决策、收益如何分配，以及风险发生时由谁承担责任。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span className="rounded-[2px] border border-white/15 bg-white/5 px-3 py-1.5 font-sans text-xs font-semibold text-zinc-300" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/legal/risk-disclosure/" variant="gold">
              查看风险披露
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
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">项目本身只是一部分，合作结构决定利益边界</h2>
          </div>
          <Card className="md:p-10">
            <div className="grid gap-5 text-base leading-8 text-muted md:text-lg md:leading-9">
              <p>很多投资人看美国房地产项目时，第一反应是看位置、成本、租金、退出价值和收益测算。但在实际项目合作中，项目本身只是一部分。真正决定投资人利益边界的，往往是合作结构。</p>
              <p>一个项目看起来不错，并不代表合作结构安全。一个项目回报测算很吸引人，也不代表投资人能够及时了解项目进度、控制关键风险或在出现延期、超支、融资变化时获得充分保护。</p>
              <p>
                LP / GP 结构，是很多房地产项目、私募项目和合伙投资中常见的合作安排。理解它，不是为了记住几个法律名词，而是为了看清：谁负责管理，谁承担责任，谁有决策权，谁获得信息，谁承担风险，谁享有收益。更多跨境风险背景可参考
                <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/research/chinese-investors-us-real-estate-risks/">
                  中国投资人美国房地产常见风险
                </Link>
                。
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <div className="max-w-4xl">
            <p className="font-sans text-sm font-semibold text-gold">Structure Review</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">投资人应该看懂的结构问题</h2>
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">
              以下内容用于建立一般性判断框架。具体合作安排应结合项目文件、合同文本和相关持牌或专业人士意见判断。涉及证券、法律、税务、贷款、保险、移民或投资结构问题时，也应先阅读
              <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/legal/risk-disclosure/">
                风险披露
              </Link>
              。
            </p>
          </div>

          <div className="mt-10 grid gap-6">
            {sections.map((section) => (
              <Card className="bg-white md:p-9" key={section.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug text-ink md:text-2xl">{section.title}</h3>
                <p className="mt-5 text-base leading-8 text-muted">{section.body}</p>
                {section.risk ? <p className="mt-4 rounded-md border border-line bg-zinc-50 p-4 text-sm leading-7 text-muted">{section.risk}</p> : null}
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
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">SAREC Review</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">SAREC 如何帮助客户理解合作结构？</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              SAREC 的价值不是替客户做最终投资决定，而是帮助客户在进入项目之前，把合作结构中的关键问题先提出来、列清楚、分层判断。实际项目也可以结合
              <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/case-studies/">
                案例研究
              </Link>
              与
              <Link className="border-b border-gold font-sans font-semibold text-ink hover:text-gold" href="/zh/services/">
                服务架构
              </Link>
              进一步讨论。
            </p>
          </div>
          <Card className="md:p-9">
            <ul className="grid gap-3 text-sm leading-7 text-muted md:text-base">
              {sarecFocus.map((point) => (
                <li className="border-l-2 border-gold pl-4" key={point}>
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button href="/zh/services/strategy/">了解项目初筛服务</Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-2">
          <Card className="bg-white md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">Conclusion</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">项目机会要看，合作结构更要看</h2>
            <div className="mt-6 grid gap-5 text-base leading-8 text-muted">
              <p>一个美国房地产项目是否值得继续推进，不能只看项目介绍、租金测算和退出价值。对投资人而言，真正重要的是：这个项目是否有清晰的管理方、透明的资金路径、合理的费用机制、稳定的信息披露、明确的重大事项决策和可讨论的退出路径。</p>
              <p>好的结构不能消除所有风险，但可以让风险更早被看见、更清楚地被讨论、更有机制地被处理。SAREC 希望帮助跨境客户在美国房地产项目合作中，先看清结构，再讨论机会。</p>
            </div>
          </Card>
          <Card className="border-gold/40 bg-white md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">重要说明</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">重要说明</h2>
            <p className="mt-6 text-base leading-8 text-muted">
              本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。LP / GP 合作结构、房地产项目投资、私募发行、税务处理、贷款安排、保险、EB-5 和跨境交易均涉及复杂风险。具体事项应结合项目文件、合同文本和相关持牌或专业人士意见审慎判断。
            </p>
          </Card>
        </div>
      </section>

      <section className="py-12 md:py-24">
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
            <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如果你正在看一个美国房地产项目，先把合作结构看清楚。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
              你可以提交项目资料、合作协议框架或项目介绍。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。
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
