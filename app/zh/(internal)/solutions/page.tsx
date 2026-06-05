import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '合作方案与服务产品｜SAREC 中美房地产商会',
  description:
    'SAREC 帮助跨境投资人、项目方和高净值家庭，把美国房地产机会转化为可以判断、可以执行、可以合作的项目路径。',
  path: '/zh/solutions'
});

const heroPrimaryClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-ink px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-white transition-colors duration-150 hover:bg-black sm:w-auto';
const heroSecondaryClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-white bg-white px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-ink transition-colors duration-150 hover:bg-zinc-100 sm:w-auto';
const darkSecondaryClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-transparent px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-ink transition-colors duration-150 hover:bg-ink hover:text-white sm:w-auto';

const customerEntries = [
  {
    title: '我有资金，但不知道美国地产项目能不能投',
    description: '你需要的不是更多项目信息，而是判断框架、风险识别和可执行路径。'
  },
  {
    title: '我有项目，但缺资本、结构和跨境协同',
    description: '好项目不仅需要资金，还需要清晰的合作结构、可信表达和持续推进能力。'
  },
  {
    title: '我想在美国做房地产，但不知道从哪里开始',
    description: '从城市、政策、土地、开发商、贷款、退出到合作结构，每一步都需要判断。'
  },
  {
    title: '我是新移民或企业主，希望配置美国资产',
    description: '房地产、保险、现金流、家庭保障和税务协同，需要放在一个长期框架里看。'
  }
];

const productPackages = [
  {
    title: '项目初筛与投资判断',
    fit: '已经看到一个美国房地产项目，但不确定是否值得继续推进的投资人或项目方。',
    solve: ['这个项目是否值得继续看？', '主要风险在哪里？', '资料是否完整？', '投资逻辑是否成立？'],
    deliverables: ['项目初步判断意见', '核心风险点列表', '资料补充清单', '是否建议继续推进的结论'],
    fee: '按项目复杂度和资料完整度收取咨询费。',
    cta: '预约项目初筛'
  },
  {
    title: '深度尽调与风控分析',
    fit: '已经进入实质合作或谈判阶段的客户。',
    solve: ['开发商是否可靠？', '财务模型是否合理？', '审批、建设、融资、出租、退出风险是否被充分识别？', '合作结构是否保护投资人？'],
    deliverables: ['项目尽调框架', '核心风险清单', '财务与退出逻辑审查', '合作风险提示', '下一步谈判建议'],
    fee: '根据项目规模、尽调深度和参与周期收取顾问费。',
    cta: '提交项目资料'
  },
  {
    title: '投资结构与合作方案设计',
    fit: '需要梳理合作结构、权责安排、退出机制与投资人沟通机制的项目方或合作伙伴。',
    solve: ['钱怎么进？', '谁来管？', '收益如何安排？', '风险怎么控？', '投资人如何获得透明信息？'],
    deliverables: ['合作结构建议', '利益分配逻辑', '投资人沟通机制建议', '关键风控节点设计', '项目推进路径建议'],
    fee: '可按咨询费、项目顾问费或合作方案设计费收取。',
    cta: '讨论合作结构'
  },
  {
    title: '房地产项目合作与资本协同',
    fit: '有项目、有资源、有资金或有投资人，但需要跨境房地产合作、资源整合和项目推进能力的合作方。',
    solve: ['项目如何被投资人理解？', '资本如何进入？', '项目方与资金方如何建立信任？', '如何推动项目从机会变成合作？'],
    deliverables: ['项目表达优化', '投资人沟通材料建议', '资本与项目匹配', '合作路径设计', '持续推进协同'],
    fee: '具体费用机制按合作协议约定。',
    cta: '洽谈项目合作'
  },
  {
    title: '美国家庭资产配置咨询',
    fit: '新移民家庭、企业主、高净值客户，希望在美国建立更稳健的资产结构。',
    solve: ['家庭资产如何在美国配置？', '房地产、保险、现金流和长期保障如何协同？', '如何避免只看单个产品，而忽略整体结构？'],
    deliverables: ['家庭资产现状梳理', '美国房地产配置思路', '现金流与风险承受能力分析', '保险与长期保障协同建议', '后续执行路径建议'],
    fee: '按咨询深度和服务范围收取咨询费。如涉及具体金融、保险、贷款或税务服务，应由相应合规主体或专业人士参与。',
    cta: '预约资产配置沟通'
  },
  {
    title: '美国房地产考察、培训与社群',
    fit: '希望系统了解美国房地产投资、开发、EB-5、项目合作和跨境资产配置的企业家、投资人和房地产从业者。',
    solve: ['如何快速理解美国地产市场？', '如何识别项目机会与风险？', '如何建立美国本地资源网络？', '如何进入长期学习和合作圈层？'],
    deliverables: ['主题培训', '项目考察', '线下交流', '投资逻辑讲解', '社群连接', '后续项目机会沟通'],
    fee: '可按课程、考察、活动、会员或定制服务收取费用。',
    cta: '了解考察与培训'
  }
];

const pathways = [
  {
    title: '低门槛判断路径',
    fit: '第一次接触美国地产项目的投资人。',
    flow: '提交资料 → 项目初筛 → 风险判断 → 是否进入深度尽调'
  },
  {
    title: '高净值资产配置路径',
    fit: '新移民家庭、企业主、高净值客户。',
    flow: '需求沟通 → 资产结构梳理 → 房地产配置建议 → 后续项目或产品匹配'
  },
  {
    title: '项目合作路径',
    fit: '项目方、开发商、房地产同行、资本方。',
    flow: '项目沟通 → 合作结构设计 → 投资人表达 → 资源协同 → 项目推进'
  }
];

const fitList = [
  '希望认真判断美国房地产项目的投资人',
  '希望建立长期美国资产配置框架的新移民家庭',
  '有项目但需要资本、结构和表达能力的项目方',
  '希望进入美国房地产市场的中国企业家或同行',
  '重视风险控制、信息透明和长期合作的人'
];

const notFitList = [
  '只想听确定性收益承诺的人',
  '不愿意提供真实资料的人',
  '只追求短期暴利、不接受风险披露的人',
  '不重视合规、合同和专业意见的人',
  '希望用模糊信息快速推进项目的人'
];

const deliverables = [
  '项目初步判断意见',
  '风险清单',
  '资料补充清单',
  '财务与退出逻辑审查',
  '合作结构建议',
  '投资人沟通建议',
  '后续推进路径',
  '必要时引入律师、会计师、贷款、保险、地产等专业资源'
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

export default function SolutionsPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Work With SAREC</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">
            把美国房地产机会，变成可以判断、可以执行、可以合作的项目。
          </h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            SAREC 面向跨境投资人、项目方、房地产从业者与高净值家庭，提供项目判断、风险控制、结构设计、资源协同与项目合作支持。我们的目标不是简单介绍机会，而是帮助客户看清项目、设计路径、控制风险，并推动合作真正落地。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a className={heroPrimaryClass} href="/zh/contact/">
              提交项目或需求
            </a>
            <a className={heroSecondaryClass} href="/zh/services/strategy">
              了解项目判断服务
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Clients" title="你可能正在面对这四类问题" />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {customerEntries.map((item, index) => (
              <Card className="md:p-9" key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">0{index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader
            eyebrow="Products"
            title="SAREC 服务产品矩阵"
            subtitle="我们把复杂的跨境地产合作拆解成不同阶段的服务产品，客户可以从低门槛判断开始，也可以进入深度尽调、结构设计和项目合作。"
          />
          <div className="mt-10 grid gap-5 xl:grid-cols-2">
            {productPackages.map((item, index) => (
              <Card className="md:p-9" key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">Product {index + 1}</p>
                <h3 className="mt-3 font-sans text-2xl font-semibold leading-snug">{item.title}</h3>
                <div className="mt-6 grid gap-4 text-sm leading-7 text-muted md:text-base">
                  <p>
                    <span className="font-sans font-semibold text-ink">适合：</span>
                    {item.fit}
                  </p>
                  <div>
                    <p className="font-sans font-semibold text-ink">解决：</p>
                    <ul className="mt-3 grid gap-2">
                      {item.solve.map((line) => (
                        <li className="border-l-2 border-gold pl-4" key={line}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-ink">交付：</p>
                    <ul className="mt-3 grid gap-2">
                      {item.deliverables.map((line) => (
                        <li className="border-l-2 border-line pl-4" key={line}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p>
                    <span className="font-sans font-semibold text-ink">收费表达：</span>
                    {item.fee}
                  </p>
                </div>
                <div className="mt-8">
                  <a className={darkSecondaryClass} href="/zh/contact/">
                    {item.cta}
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Pathways" title="从一次项目判断，到长期项目合作" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {pathways.map((item, index) => (
              <Card key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">Path {index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">
                  <span className="font-sans font-semibold text-ink">适合：</span>
                  {item.fit}
                </p>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">
                  <span className="font-sans font-semibold text-ink">流程：</span>
                  {item.flow}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader eyebrow="Principles" title="我们不是所有项目都推进" />
          <Card>
            <p className="text-muted">
              SAREC 更重视项目的真实性、结构清晰度、风险可控性和长期合作价值。我们会优先考虑具备以下特征的合作机会：
            </p>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
              {[
                '项目逻辑清晰，资料相对完整',
                '项目方愿意接受透明沟通和持续信息披露',
                '投资人风险收益预期相对理性',
                '合作结构可以被解释、被执行、被监督',
                '项目具备真实落地条件，而不是停留在概念包装',
                '各方愿意用长期信用，而不是短期话术推动合作'
              ].map((item) => (
                <li className="border-l-2 border-gold pl-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader
            eyebrow="Deliverables"
            title="你最终得到的不是一句“可以”或“不可以”"
            subtitle="SAREC 的服务重点不是简单表态，而是帮助客户形成可讨论、可判断、可执行的决策依据。"
          />
          <Card>
            <ul className="grid gap-3 text-sm leading-7 text-muted md:text-base">
              {deliverables.map((item) => (
                <li className="border-l-2 border-line pl-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Fit" title="什么样的客户适合 SAREC？" />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <Card>
              <h3 className="font-sans text-xl font-semibold">适合</h3>
              <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
                {fitList.map((item) => (
                  <li className="border-l-2 border-gold pl-4" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="font-sans text-xl font-semibold">不适合</h3>
              <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
                {notFitList.map((item) => (
                  <li className="border-l-2 border-line pl-4" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Compliance" title="重要说明" />
          <Card>
            <div className="grid gap-4 text-muted">
              <p>
                SAREC 提供的是项目判断、资源协同、结构建议和合作推进服务。房地产投资、项目开发、融资、保险、税务和法律事项均存在风险。
              </p>
              <p>
                具体交易应结合律师、会计师、贷款机构、保险顾问、持牌专业人士及相关合规主体的意见后审慎决策。
              </p>
            </div>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-ink md:grid-cols-2">
              <a className="border-b border-line pb-2 hover:text-gold" href="/zh/services/strategy">
                项目判断服务
              </a>
              <a className="border-b border-line pb-2 hover:text-gold" href="/zh/projects/">
                项目与案例
              </a>
              <a className="border-b border-line pb-2 hover:text-gold" href="/zh/research/framework/">
                项目判断框架
              </a>
              <a className="border-b border-line pb-2 hover:text-gold" href="/zh/research/risk-checklist/">
                风险清单
              </a>
              <a className="border-b border-line pb-2 hover:text-gold md:col-span-2" href="/zh/contact/">
                联系我们
              </a>
            </div>
          </Card>
        </div>
      </section>

      <section className="bg-deep py-12 text-white md:py-24">
        <div className="container-shell grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
          <div>
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">
              如果你正在判断一个美国房地产机会，现在可以从一次沟通开始。
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
              无论你是投资人、项目方、房地产同行，还是正在配置美国资产的新移民家庭，都可以先提交你的需求。我们会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <a className={heroPrimaryClass} href="/zh/contact/">
              提交项目或合作需求
            </a>
            <a className={heroSecondaryClass} href="/zh/services/strategy">
              查看项目判断服务
            </a>
          </div>
        </div>
      </section>
    </article>
  );
}
