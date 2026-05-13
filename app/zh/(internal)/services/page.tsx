import type { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { ServiceScrollRestoration } from '@/components/sections/ServiceScrollRestoration';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '服务体系｜SAREC 中美房地产商会',
  description:
    '了解 SAREC 的服务产品矩阵，包括项目初筛、深度尽调、投资结构设计、项目合作、家庭资产配置咨询、房地产考察与培训。',
  path: '/zh/services'
});

const primaryButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-ink px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-white transition-colors duration-150 hover:bg-black sm:w-auto';
const secondaryButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-white bg-white px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-ink transition-colors duration-150 hover:bg-zinc-100 sm:w-auto';
const outlineButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-transparent px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-ink transition-colors duration-150 hover:bg-ink hover:text-white sm:w-auto';

const audienceItems = [
  {
    title: '跨境投资人',
    description: '已经接触美国房地产项目，但需要判断项目是否真实、逻辑是否成立、风险是否可控。'
  },
  {
    title: '项目方与开发商',
    description: '有项目、有资源或有执行能力，但需要资本协同、结构设计和投资人沟通支持。'
  },
  {
    title: '房地产同行与合作伙伴',
    description: '希望在美国地产开发、投资、资金、项目资源之间建立长期合作关系。'
  },
  {
    title: '新移民家庭与企业主',
    description: '希望通过美国房地产、保险、现金流和长期资产配置，建立更稳健的家庭资产结构。'
  }
];

const serviceProducts = [
  {
    title: '项目初筛与投资判断',
    summary: '先判断项目值不值得继续看。',
    fit: '看到一个美国房地产项目，但不确定是否继续推进的投资人或项目方。',
    work: ['项目资料初步审查', '投资逻辑判断', '主要风险识别', '资料补充建议', '是否继续推进的结论'],
    ctaText: '了解项目判断服务',
    href: '/zh/services/strategy'
  },
  {
    title: '深度尽调与风控分析',
    summary: '在出资、合伙或签约前，把风险看清楚。',
    fit: '已经进入实质谈判、准备出资或准备合作的客户。',
    work: ['开发商背景与履约能力分析', '项目审批、建设、融资、出租、退出风险识别', '财务模型和收益逻辑审查', '合作结构风险提示', '下一步谈判建议'],
    ctaText: '提交项目资料',
    href: '/zh/contact/'
  },
  {
    title: '投资结构与合作方案设计',
    summary: '把钱、权、责、利、退出机制设计清楚。',
    fit: '项目方、资本方、GP/LP 合作方、房地产同行。',
    work: ['LP/GP 合作结构建议', '收益分配与管理费逻辑', '风控节点设计', '投资人信息披露机制', '项目推进路径建议'],
    ctaText: '讨论合作结构',
    href: '/zh/contact/'
  },
  {
    title: '房地产项目合作与资本协同',
    summary: '推动项目、资本和合作方真正对接并向前推进。',
    fit: '有项目、有资金、有投资人或有资源，但缺少跨境协同能力的合作方。',
    work: ['项目表达优化', '投资人沟通材料建议', '资本与项目匹配', '合作路径设计', '项目推进协同'],
    note: '可根据具体合作方式采用顾问费、项目服务费、管理费、佣金、分成或 GP 参与等方式。',
    ctaText: '洽谈项目合作',
    href: '/zh/solutions'
  },
  {
    title: '美国家庭资产配置咨询',
    summary: '帮助新移民和高净值家庭建立美国资产配置框架。',
    fit: '新移民家庭、企业主、高净值客户、跨境家庭。',
    work: ['家庭资产结构梳理', '美国房地产配置思路', '现金流和风险承受能力分析', '保险与长期保障协同建议', '后续执行路径建议'],
    note: '如涉及具体金融、保险、贷款、税务或法律服务，应由相应持牌或专业人士参与。',
    ctaText: '预约资产配置沟通',
    href: '/zh/contact/'
  },
  {
    title: '房地产考察、培训与社群',
    summary: '用线下考察和系统培训，帮助客户理解美国地产市场。',
    fit: '中国企业家、新移民、房地产同行、投资人、希望进入美国市场的人群。',
    work: ['美国房地产主题培训', '项目考察', '线下交流', '投资逻辑讲解', '资源连接', '长期社群沉淀'],
    ctaText: '了解考察与培训',
    href: '/zh/contact/'
  }
];

const pathways = [
  {
    title: '项目判断路径',
    fit: '第一次接触美国地产项目的投资人。',
    flow: '提交项目资料 → 初步判断 → 风险清单 → 是否进入深度尽调'
  },
  {
    title: '项目合作路径',
    fit: '项目方、开发商、房地产同行、资本方。',
    flow: '项目沟通 → 合作结构设计 → 投资人表达 → 资源协同 → 项目推进'
  },
  {
    title: '家庭资产配置路径',
    fit: '新移民家庭、企业主、高净值客户。',
    flow: '需求沟通 → 资产结构梳理 → 房地产配置建议 → 后续产品或项目匹配'
  }
];

const challenges = [
  '不知道项目资料是否完整',
  '不知道开发商是否可靠',
  '不知道收益模型是否过于乐观',
  '不知道合作结构是否保护自己',
  '不知道风险发生时谁负责',
  '不知道项目如何持续推进',
  '不知道该找哪些专业人士参与'
];

const relatedEntries = [
  {
    title: '合作方案与服务产品',
    description: '了解 SAREC 如何与投资人、项目方和高净值家庭合作。',
    href: '/zh/solutions'
  },
  {
    title: '项目初筛与投资判断',
    description: '从低门槛项目判断开始，先看清楚项目是否值得继续推进。',
    href: '/zh/services/strategy'
  },
  {
    title: '项目与案例',
    description: '查看 SAREC 参与或展示的代表性项目经验。',
    href: '/zh/projects/'
  },
  {
    title: '项目判断框架',
    description: '了解美国房地产项目判断的基本逻辑。',
    href: '/zh/research/framework/'
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

export default function ServicesPage() {
  return (
    <article>
      <ServiceScrollRestoration pagePath="/zh/services/" />

      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Services</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">SAREC 服务体系</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            从项目判断、风险控制、结构设计到资源协同，SAREC 帮助跨境投资人、项目方和高净值家庭，把美国房地产机会转化为更清晰、更可执行的合作路径。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a className={primaryButtonClass} href="/zh/solutions">
              查看合作方案
            </a>
            <a className={secondaryButtonClass} href="/zh/contact/">
              提交项目或需求
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Audience" title="我们主要服务四类客户" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {audienceItems.map((item) => (
              <Card key={item.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug">{item.title}</h3>
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
            title="服务产品矩阵"
            subtitle="我们把跨境地产合作拆解为六类服务产品。客户可以从低门槛项目判断开始，也可以进入深度尽调、结构设计、项目合作和长期资产配置。"
          />
          <div className="mt-10 grid gap-5 xl:grid-cols-2">
            {serviceProducts.map((item, index) => (
              <Card className="md:p-9" key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">Service {index + 1}</p>
                <h3 className="mt-3 font-sans text-2xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 font-sans text-base font-semibold text-ink">{item.summary}</p>
                <div className="mt-6 grid gap-4 text-sm leading-7 text-muted md:text-base">
                  <p>
                    <span className="font-sans font-semibold text-ink">适合：</span>
                    {item.fit}
                  </p>
                  <div>
                    <p className="font-sans font-semibold text-ink">核心工作：</p>
                    <ul className="mt-3 grid gap-2">
                      {item.work.map((line) => (
                        <li className="border-l-2 border-gold pl-4" key={line}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {item.note ? (
                    <p>
                      <span className="font-sans font-semibold text-ink">{item.title === '美国家庭资产配置咨询' ? '合规提示：' : '收费方式说明：'}</span>
                      {item.note}
                    </p>
                  ) : null}
                </div>
                <div className="mt-8">
                  <a className={outlineButtonClass} href={item.href}>
                    {item.ctaText}
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Pathways" title="从一次判断，到长期合作" />
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
          <SectionHeader eyebrow="Why SAREC" title="真正困难的不是找到项目，而是判断、结构和执行" />
          <Card>
            <p className="text-muted">
              美国房地产机会很多，但跨境客户真正面临的挑战通常不是信息不足，而是：
            </p>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
              {challenges.map((item) => (
                <li className="border-l-2 border-gold pl-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line pt-6 font-sans font-semibold text-ink">
              SAREC 的服务重点，是把分散的信息、资源和机会，转化为可以判断、可以讨论、可以执行的合作方案。
            </p>
          </Card>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Next" title="继续了解" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {relatedEntries.map((item) => (
              <Card key={item.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.description}</p>
                <a className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink hover:text-gold" href={item.href}>
                  前往查看
                </a>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-deep py-12 text-white md:py-24">
        <div className="container-shell grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
          <div>
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">
              如果你正在判断一个美国房地产项目，可以先从一次沟通开始。
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
              无论你是投资人、项目方、房地产同行，还是正在配置美国资产的新移民家庭，都可以提交你的需求。SAREC 会根据项目阶段、资料完整度和合作可能性，判断是否适合继续沟通。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <a className={primaryButtonClass} href="/zh/contact/">
              提交项目或需求
            </a>
            <a className={secondaryButtonClass} href="/zh/solutions">
              查看合作方案
            </a>
          </div>
        </div>
      </section>
    </article>
  );
}
