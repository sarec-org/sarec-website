import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '案例研究｜SAREC 中美房地产商会',
  description:
    'SAREC 案例研究展示美国房地产项目判断、风险识别、合作结构和跨境资源协同方法，帮助投资人和项目方理解项目机会背后的真实逻辑。',
  path: '/zh/case-studies'
});

const categories = [
  {
    title: '真实项目案例',
    body: '展示真实项目的区位、阶段、开发逻辑、风险识别和合作判断。公开页面只展示适合公开的信息，不披露完整财务模型和敏感交易资料。'
  },
  {
    title: '项目初筛案例',
    body: '通过脱敏案例说明，为什么一个看起来收益很高的项目，仍然需要先看土地、审批、成本、融资和退出。'
  },
  {
    title: '合作结构案例',
    body: '展示项目本身之外，资金进入方式、管理权、信息披露、重大事项决策和退出机制的重要性。'
  },
  {
    title: '资本协同案例',
    body: '说明好项目如何被投资人理解，项目方如何把复杂项目转化为可以讨论、可以判断、可以推进的合作方案。'
  }
];

const featuredTags = ['真实项目案例', 'ED1 经济适用房开发', '洛杉矶 East Hollywood', '项目判断案例'];

const projectCases = [
  {
    title: '3434 Chesapeake｜ED1 经济适用房开发项目',
    tags: ['ED1 项目', '100% 经济适用房', 'RTI Ready', '政策判断案例'],
    summary:
      '3434 Chesapeake 位于洛杉矶 West Adams - Baldwin Hills - Leimert 社区，是一个 100% 经济适用房开发项目，规划约 66 个住宅单位。该项目已进入 RTI Ready 阶段，适合用于说明洛杉矶 ED1 政策下的审批效率、土地利用提升和项目推进能力。',
    capabilities: ['政策红利识别', '快速审批推进', 'RTI Ready 项目管理', '建筑贷款对接', 'GC 招标与合同谈判', 'GP 项目参与']
  },
  {
    title: '2215 Wellesley｜复杂规划区协调案例',
    tags: ['ED1 项目', 'EXPO TNP', 'Plan Check', '跨部门协调案例'],
    summary:
      '2215 Wellesley 是位于洛杉矶、受 EXPO TNP 特定规划区约束的 100% 经济适用房开发项目。该项目涉及施工图审查、公用事业协调、LADWP 与 LAFD 技术问题处理，适合用于说明复杂城市规划条件下的合规推进和跨部门协调能力。',
    capabilities: ['特殊规划区判断', 'Plan Check 推进', 'LADWP / LAFD 协调', '消防与安全规范处理', '施工图与许可推进', 'GP 项目参与']
  },
  {
    title: 'YOO Los Angeles｜品牌住宅与 EB-5 结构观察案例',
    tags: ['品牌住宅', 'Wilshire 走廊', 'EB-5 结构观察', '高端项目分析'],
    summary:
      'YOO Los Angeles 是一个位于 Wilshire 大道核心区的品牌住宅项目案例，涉及高端住宅定位、国际设计品牌、EB-5 资金结构和长期开发周期。该案例适合用于说明高端住宅项目的品牌溢价、资金结构、市场定位和合规风险。',
    capabilities: ['高端住宅定位', '品牌溢价分析', 'EB-5 结构观察', '市场供需判断', '开发周期分析', '合规风险识别']
  }
];

const anonymizedCases = [
  {
    title: '脱敏案例｜审批路径选择错误，让一个短周期项目变成长周期项目',
    tags: ['审批路径判断', '开发周期风险', '时间成本', '产品结构选择', '风控案例'],
    summary:
      '一个住宅开发项目，原计划将一处独立住宅拆除后，开发为多个小型住宅产品。项目表面看起来很有吸引力：土地成本相对较低，建成后的产品单价较高，账面利润空间明显。但真正的问题不在销售价格，而在审批路径。',
    coreRisk:
      '项目早期如果采用更适合的产权和产品结构，审批周期可能明显缩短。但由于方案选择偏差，项目最终进入了更复杂、更漫长的审批路径，实际审批时间被大幅拉长。房地产开发中，时间本身就是成本。即使项目最终仍有利润，如果原本预计较短周期完成的项目，被拖成多年周期，资金占用、市场变化、建设成本、销售价格和机会成本都会显著改变项目结果。',
    focus: [
      '项目不是只看建成后的销售价格。',
      '审批路径和产品结构会直接影响开发周期。',
      '时间拉长会稀释项目年化回报。',
      '市场下行时，原来的销售假设可能不再成立。',
      '开发前应先比较不同审批路径的时间成本、法律结构和退出方式。'
    ],
    takeaway:
      '美国房地产开发不能简单照搬过去熟悉的开发经验。一个项目表面看起来利润很高，但如果审批路径选择不当，开发周期被大幅拉长，最终项目的风险收益结构就会完全改变。',
    cta: '咨询项目风控',
    href: '/zh/contact/'
  },
  {
    title: '脱敏案例｜靠近大学，不等于一定适合做学生公寓',
    tags: ['学生公寓风险', '微区位判断', '市场调研', '租金假设验证', '融资可行性'],
    summary:
      '一个大学周边的多单元住宅项目，计划将独立住宅拆除后，重建为学生公寓。项目最初的逻辑看起来很清楚：周边有大型大学，学生数量庞大，单间出租模式看起来收益较高，建成后可以出租，再通过再融资和未来出售实现退出。',
    coreRisk:
      '项目方把“靠近大学”简单等同于“学生公寓需求稳定”。但大学周边的租赁市场并不是一个整体。不同街区、步行距离、交通便利性、安全感、生活配套和竞争供给，都会直接影响出租结果。某些街区可能非常好租，而距离稍远、通勤不便或竞争激烈的区域，即使名义上仍在大学周边，也可能面临租金下调、出租速度变慢和客群转变的问题。同时，新移民项目方在美国本地信用、建筑贷款获取和银行融资方面也可能面临现实障碍。如果融资路径没有提前验证，项目推进过程中可能出现资金压力。',
    focus: [
      '大学周边不等于所有位置都适合学生公寓。',
      '租赁需求必须精细到街区、距离、交通和客群。',
      '周边同类供给过多，会压低租金和出租速度。',
      '新移民项目方必须提前验证建筑贷款可得性。',
      '“先出租、再重贷、再出售”的路径必须建立在真实租金和融资条件上。',
      '项目买入前的市场调研，比后期补救更重要。'
    ],
    takeaway:
      '美国房地产投资不能只看大概念。大学、医院、地铁、商圈这些标签本身并不等于项目安全。真正的判断要回到微区位、供需关系、租赁客群、融资可行性和退出路径。',
    cta: '提交项目初筛',
    href: '/zh/services/strategy/'
  }
];

const anonymizedCaseNotes = [
  '表面利润空间不等于真实投资结果。',
  '审批周期、融资条件和市场变化会重塑项目价值。',
  '项目判断必须从宏观概念落到微区位、成本、租金和退出路径。',
  '公开案例只展示适合公开的信息，不披露真实人名、地址、交易细节和敏感财务模型。'
];

export default function CaseStudiesPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Case Studies</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">案例研究</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            SAREC
            关注的不只是项目本身，更关注项目背后的判断逻辑、风险结构、合作机制和落地能力。我们通过真实项目和脱敏案例，帮助跨境客户理解美国房地产项目如何被筛选、评估和推进。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/case-studies/4136-rosewood/" variant="gold">
              查看 Rosewood 案例
            </Button>
            <Button href="/zh/contact/" variant="light">
              提交项目或合作需求
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <div className="max-w-3xl">
            <p className="font-sans text-sm font-semibold text-gold">Case Types</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">案例分类</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((item) => (
              <Card key={item.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <div className="max-w-3xl">
            <p className="font-sans text-sm font-semibold text-gold">Real Project Cases</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">真实项目案例</h2>
          </div>
          <div className="mt-10 grid gap-5">
            <Card className="bg-white md:p-10">
              <div className="flex flex-wrap gap-2">
                {featuredTags.map((tag) => (
                  <span className="rounded-[2px] border border-line bg-zinc-50 px-3 py-1.5 font-sans text-xs font-semibold text-muted" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="mt-6 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">4136 Rosewood｜洛杉矶 East Hollywood · ED1 经济适用房开发</h3>
              <p className="mt-5 max-w-4xl text-base leading-8 text-muted md:text-lg md:leading-9">
                4136 Rosewood 是一个位于洛杉矶 East Hollywood 的 ED1 经济适用房开发项目，规划约 69
                个公寓单元、6 层建筑，适合用于说明美国城市住宅开发项目从土地、审批、成本、融资、租赁到退出的系统判断逻辑。
              </p>
              <div className="mt-8">
                <Button href="/zh/case-studies/4136-rosewood/">查看案例</Button>
              </div>
            </Card>

            <div className="grid gap-5 lg:grid-cols-3">
              {projectCases.map((project) => (
                <Card className="bg-white md:p-8" key={project.title}>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span className="rounded-[2px] border border-line bg-zinc-50 px-3 py-1.5 font-sans text-xs font-semibold text-muted" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-5 font-sans text-xl font-semibold leading-snug text-ink">{project.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted md:text-base">{project.summary}</p>
                  <div className="mt-6 border-t border-line pt-5">
                    <p className="font-sans text-sm font-semibold text-ink">能力要点</p>
                    <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted">
                      {project.capabilities.map((capability) => (
                        <li className="border-l-2 border-gold pl-4" key={capability}>
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-7">
                    <Button href="/zh/contact/" variant="secondary">
                      咨询类似项目
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <div className="max-w-3xl">
            <p className="font-sans text-sm font-semibold text-gold">Risk Review</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">风控与脱敏案例</h2>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {anonymizedCases.map((item) => (
              <Card className="md:p-8" key={item.title}>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span className="rounded-[2px] border border-line bg-zinc-50 px-3 py-1.5 font-sans text-xs font-semibold text-muted" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="mt-5 font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.summary}</p>
                <div className="mt-6 rounded-md border border-line bg-zinc-50 p-5">
                  <p className="font-sans text-sm font-semibold text-ink">核心风险</p>
                  <p className="mt-3 text-sm leading-7 text-muted">{item.coreRisk}</p>
                </div>
                <div className="mt-6 border-t border-line pt-5">
                  <p className="font-sans text-sm font-semibold text-ink">SAREC 判断重点</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted">
                    {item.focus.map((point) => (
                      <li className="border-l-2 border-gold pl-4" key={point}>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-6 text-sm leading-7 text-muted">
                  <span className="font-sans font-semibold text-ink">这个案例说明：</span>
                  {item.takeaway}
                </p>
                <div className="mt-7">
                  <Button href={item.href} variant="secondary">
                    {item.cta}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-8 md:p-10">
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="font-sans text-sm font-semibold text-gold">Case Method</p>
                <h3 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">脱敏案例的价值，不在于讲故事，而在于训练判断框架</h3>
              </div>
              <div>
                <p className="text-base leading-8 text-muted">
                  SAREC
                  展示脱敏案例，不是为了评价某一个具体项目或某一位项目方，而是为了说明美国房地产项目中常见的判断误区。对于跨境投资人和项目方而言，真正重要的不是听到一个机会，而是学会识别项目背后的审批路径、市场假设、融资条件、合作结构和退出风险。
                </p>
                <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
                  {anonymizedCaseNotes.map((note) => (
                    <li className="border-l-2 border-gold pl-4" key={note}>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">How We Use Cases</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">我们展示案例，不是为了制造收益想象</h2>
          </div>
          <Card className="bg-white md:p-10">
            <p className="text-base leading-8 text-muted md:text-lg md:leading-9">
              SAREC
              的案例研究不以收益承诺为目的，而是用于说明美国房地产项目如何被判断、拆解和推进。公开页面只展示适合公开的信息，不披露完整财务模型、敏感交易条件或未授权资料。具体项目合作应基于最新资料、合同文件和专业人士意见审慎判断。
            </p>
          </Card>
        </div>
      </section>

      <section className="bg-deep py-12 text-white md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如果你正在判断一个美国房地产项目，可以先让我们看一眼。</h2>
          <Button href="/zh/contact/" variant="light">
            提交项目或合作需求
          </Button>
        </div>
      </section>
    </article>
  );
}
