import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '项目与案例｜SAREC 中美房地产商会',
  description:
    '查看 SAREC 关注的美国房地产项目、脱敏案例、风控逻辑与项目判断框架，理解跨境地产合作如何被评估和推进。',
  path: '/zh/projects'
});

const primaryButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-ink px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-white transition-colors duration-150 hover:bg-black sm:w-auto';
const secondaryButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-white bg-white px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-ink transition-colors duration-150 hover:bg-zinc-100 sm:w-auto';
const outlineButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-transparent px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-ink transition-colors duration-150 hover:bg-ink hover:text-white sm:w-auto';

const rosewoodSummaries = ['69 单元', '6 层', '洛杉矶成熟社区', '关键审批已推进'];

const rosewoodHighlights = ['成熟社区位置', '公寓租赁需求明确', '开发流程已进入实质推进阶段', '具备从土地、审批、建设到退出的完整分析价值'];

const rosewoodJudgmentPoints = ['审批状态是否清晰', '建设贷款与资金结构是否匹配', '开发周期是否合理', '租金和退出假设是否稳健', '投资人信息披露机制是否充分'];

const rosewoodUseCase =
  '适合说明美国城市公寓开发项目的判断逻辑、审批节点、建设风险、融资安排和退出设计。';

const caseCards = [
  {
    title: '项目初筛案例｜一个看起来收益很高的开发项目',
    background: '客户接触到一个美国房地产开发项目，项目材料强调高收益和快速退出，但基础资料不完整。',
    questions: ['土地权属和审批状态是否清晰', '开发周期是否过于乐观', '建设成本是否有充分依据', '退出价格是否建立在合理市场假设上'],
    value: '帮助客户先识别关键风险，而不是被表面收益率吸引。'
  },
  {
    title: '风控案例｜合作结构比项目本身更重要',
    background: '一个项目本身具备一定吸引力，但资金方和项目方之间的权责边界不清晰。',
    questions: ['谁负责项目管理', '资金如何进入', '信息如何披露', '重大事项谁有决策权', '出现延期或超支时如何处理'],
    value: '帮助客户把“能不能投”进一步拆解为“如何投、谁来管、怎么退出”。'
  },
  {
    title: '避坑案例｜资料不完整时，不急于推进',
    background: '客户希望快速推进一个项目合作，但项目方无法提供完整的审批、预算、贷款和退出资料。',
    questions: ['资料缺失是否影响判断', '收益测算是否缺少依据', '项目方是否愿意透明沟通', '是否存在过度包装风险'],
    value: '帮助客户在正式投入资源前，先建立资料清单和判断边界。'
  },
  {
    title: '资本协同案例｜好项目也需要被正确表达',
    background: '项目方有真实项目和执行能力，但对跨境投资人的表达方式不清晰，投资人难以理解项目逻辑。',
    questions: ['项目亮点是否表达清楚', '风险是否主动披露', '投资人最关心的问题是否被回答', '项目材料是否适合跨境沟通'],
    value: '帮助项目方把复杂项目转化为投资人能理解、能讨论、能继续推进的合作方案。'
  }
];

const frameworkItems = [
  {
    title: '市场与位置',
    body: '城市、区域、人口、租赁需求、周边供给。'
  },
  {
    title: '土地与审批',
    body: '土地状态、分区、entitlement、permit、政策风险。'
  },
  {
    title: '开发与建设',
    body: '成本预算、施工周期、承包商、延期风险、成本超支风险。'
  },
  {
    title: '融资与资本结构',
    body: '股权资金、建筑贷款、利率、再融资、资金缺口。'
  },
  {
    title: '收入与退出',
    body: '租金假设、出租速度、cap rate、出售或长期持有路径。'
  },
  {
    title: '合作与风控',
    body: 'LP/GP结构、信息披露、重大事项决策、退出机制、风险责任。'
  }
];

const relatedEntries = [
  {
    title: '案例研究',
    href: '/zh/case-studies'
  },
  {
    title: '服务架构',
    href: '/zh/services'
  },
  {
    title: '风险清单',
    href: '/zh/research/risk-checklist/'
  }
];

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-4xl">
      <p className="font-sans text-sm font-semibold text-gold">{eyebrow}</p>
      <h2 className="mt-3 font-sans text-2xl font-bold leading-tight md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-sm leading-7 text-muted md:text-base">{subtitle}</p> : null}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Projects</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">项目与案例</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            SAREC 关注的不只是项目本身，更关注项目背后的判断逻辑、风险结构、合作机制和落地能力。我们通过真实项目、脱敏案例和风控框架，帮助跨境客户更清楚地理解美国房地产项目如何被筛选、评估和推进。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a className={primaryButtonClass} href="/zh/contact/">
              提交项目或合作需求
            </a>
            <a className={secondaryButtonClass} href="/zh/services">
              查看服务架构
            </a>
            <a className={secondaryButtonClass} href="/zh/case-studies">
              案例研究
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader eyebrow="Method" title="我们展示项目，不是为了制造机会感，而是为了说明判断方法" />
          <Card>
            <p className="text-muted">
              美国房地产市场机会很多，但真正影响结果的，往往不是项目包装，而是土地、审批、融资、建设、出租、退出、合作结构和信息透明度。SAREC 在项目展示中更关注三个问题：
            </p>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
              {['这个项目为什么值得看？', '这个项目主要风险在哪里？', '如果要推进，合作结构和风控机制应该如何设计？'].map((item) => (
                <li className="border-l-2 border-gold pl-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell max-w-6xl">
          <SectionHeader eyebrow="Featured" title="代表项目" />
          <div className="mt-10 grid gap-6">
            <Card className="w-full md:p-10 lg:p-12">
              <div className="max-w-4xl">
                <span className="inline-flex w-fit rounded-[2px] border border-line bg-zinc-50 px-3 py-1.5 font-sans text-xs font-semibold text-muted">
                  已进入实质推进阶段
                </span>
                <h3 className="mt-5 font-sans text-2xl font-bold leading-tight md:text-4xl">4136 Rosewood｜洛杉矶 East Hollywood · ED1 经济适用房开发</h3>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {rosewoodSummaries.map((summary) => (
                  <div
                    className="flex min-h-24 items-center rounded-[2px] border border-line bg-zinc-50 px-4 py-4 font-sans text-base font-semibold leading-snug text-ink"
                    key={summary}
                  >
                    {summary}
                  </div>
                ))}
              </div>

              <dl className="mt-8 grid gap-4 border-y border-line py-8 md:grid-cols-2">
                <div className="rounded-[2px] bg-zinc-50 p-4">
                  <dt className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">项目类型</dt>
                  <dd className="mt-2 text-sm leading-7 text-muted">ED1 经济适用房开发</dd>
                </div>
                <div className="rounded-[2px] bg-zinc-50 p-4">
                  <dt className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">项目位置</dt>
                  <dd className="mt-2 text-sm leading-7 text-muted">洛杉矶成熟社区</dd>
                </div>
                <div className="rounded-[2px] bg-zinc-50 p-4">
                  <dt className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">项目规模</dt>
                  <dd className="mt-2 text-sm leading-7 text-muted">69 个公寓单元，6 层建筑</dd>
                </div>
                <div className="rounded-[2px] bg-zinc-50 p-4 md:row-span-2">
                  <dt className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">项目阶段</dt>
                  <dd className="mt-2 text-sm leading-7 text-muted">
                    已完成关键土地 entitlement 审批，开工许可手续已完成，建筑贷款手续已完成，随时可以开工，属于已进入实质推进阶段的开发项目。
                  </dd>
                </div>
                <div className="rounded-[2px] bg-zinc-50 p-4">
                  <dt className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">项目定位</dt>
                  <dd className="mt-2 text-sm leading-7 text-muted">符合 ED1 政策的洛杉矶城市住宅开发产品，单元面向 LA 区域工薪与中等收入家庭。</dd>
                </div>
              </dl>

              <div className="mt-8 grid gap-5 xl:grid-cols-3">
                <Card className="bg-zinc-50 md:p-7">
                  <h4 className="font-sans text-lg font-semibold text-ink">为什么这个项目值得关注</h4>
                  <ul className="mt-4 grid gap-2 text-sm leading-7 text-muted md:text-base">
                    {rosewoodHighlights.map((item) => (
                      <li className="border-l-2 border-gold pl-4" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="bg-zinc-50 md:p-7">
                  <h4 className="font-sans text-lg font-semibold text-ink">SAREC 关注的判断点</h4>
                  <ul className="mt-4 grid gap-2 text-sm leading-7 text-muted md:text-base">
                    {rosewoodJudgmentPoints.map((item) => (
                      <li className="border-l-2 border-line pl-4" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="bg-zinc-50 md:p-7">
                  <h4 className="font-sans text-lg font-semibold text-ink">这个项目适合说明什么</h4>
                  <p className="mt-4 text-sm leading-7 text-muted md:text-base">{rosewoodUseCase}</p>
                  <div className="mt-8 flex flex-col gap-3">
                    <a className={outlineButtonClass} href="/zh/case-studies/4136-rosewood">
                      查看完整案例研究
                    </a>
                    <a className={outlineButtonClass} href="/zh/services">
                      了解服务架构
                    </a>
                  </div>
                </Card>
              </div>

              <div className="mt-8 grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">
                <section>
                  <h4 className="font-sans text-lg font-semibold text-ink">项目说明</h4>
                  <p className="mt-3 text-base leading-8 text-muted">
                    4136 Rosewood 是合作网络中的洛杉矶住宅开发项目经验之一。该项目不用于制造机会感，而是用于说明一个美国城市公寓开发项目在土地、审批、建设贷款、建设周期和退出安排上，如何被拆解、判断和讨论。
                  </p>
                </section>
                <section className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                  <h4 className="font-sans text-lg font-semibold text-ink">展示边界说明</h4>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    页面展示仅作项目案例说明，不构成证券发行、收益承诺或投资建议。具体合作方式、资料披露范围与商业条款，以后续正式文件为准。
                  </p>
                </section>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Cases" title="不同行业客户，关注的是不同类型的判断" />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {caseCards.map((item) => (
              <Card className="md:p-9" key={item.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <div className="mt-6 grid gap-4 text-sm leading-7 text-muted md:text-base">
                  <p>
                    <span className="font-sans font-semibold text-ink">背景：</span>
                    {item.background}
                  </p>
                  <div>
                    <p className="font-sans font-semibold text-ink">SAREC 关注的问题：</p>
                    <ul className="mt-3 grid gap-2">
                      {item.questions.map((question) => (
                        <li className="border-l-2 border-gold pl-4" key={question}>
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p>
                    <span className="font-sans font-semibold text-ink">价值：</span>
                    {item.value}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Framework" title="我们如何看一个美国房地产项目" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {frameworkItems.map((item, index) => (
              <Card key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">0{index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Network" title="合作网络与项目经验" />
          <Card>
            <div className="grid gap-4 text-muted">
              <p>
                SAREC 的价值不只来自单一项目展示，也来自对美国本地开发商、房地产从业者、资本方、贷款、保险、法律、会计和跨境客户需求的长期理解。
              </p>
              <p>
                对于涉及第三方合作方的项目经验，我们会根据授权、公开信息和合规边界进行谨慎展示。重点不是把项目包装成机会，而是把项目所涉及的判断逻辑、结构安排、风控节点和推进路径解释清楚。
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="bg-deep py-12 text-white md:py-24">
        <div className="container-shell grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
          <div>
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">如果你正在判断一个美国房地产项目，可以先让我们看一眼。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
              无论你是投资人、项目方、房地产同行，还是正在配置美国资产的新移民家庭，都可以提交项目资料或合作需求。SAREC 会根据项目阶段、资料完整度和合作可能性，判断是否适合继续沟通。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <a className={primaryButtonClass} href="/zh/contact/">
              提交项目或合作需求
            </a>
            <a className={secondaryButtonClass} href="/zh/services/strategy">
              查看项目判断服务
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Explore" title="继续了解" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {relatedEntries.map((item) => (
              <Card key={item.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <a className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink hover:text-gold" href={item.href}>
                  前往查看
                </a>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
