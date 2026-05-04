import type { Metadata } from 'next';
import { ContactInquiryForm } from './contact-inquiry-form';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '提交项目或合作需求｜SAREC 中美房地产商会',
  description:
    '如果你正在判断美国房地产项目、寻找项目合作、配置美国资产或希望了解 SAREC 服务，可以提交项目或合作需求。',
  path: '/zh/contact'
});

const situations = [
  {
    title: '你正在判断一个美国房地产项目',
    description: '希望先看清项目逻辑、风险点和是否值得继续推进。'
  },
  {
    title: '你有项目，希望寻找资本或合作方',
    description: '需要优化项目表达、设计合作结构，并与跨境投资人建立沟通。'
  },
  {
    title: '你是投资人，想参与美国房地产项目',
    description: '希望了解项目筛选、尽调、结构设计和风险控制路径。'
  },
  {
    title: '你是新移民家庭或企业主',
    description: '希望围绕美国房地产、保险、现金流和长期保障建立资产配置框架。'
  },
  {
    title: '你希望参加美国房地产考察或培训',
    description: '希望通过线下交流、项目考察和系统培训理解美国市场。'
  },
  {
    title: '你是房地产同行或资源方',
    description: '希望建立长期项目合作、资源协同或共同服务客户的关系。'
  }
];

const requestTypes = [
  '项目初筛与投资判断',
  '深度尽调与风控分析',
  '投资结构与合作方案设计',
  '房地产项目合作与资本协同',
  '美国家庭资产配置咨询',
  '美国房地产考察、培训与社群',
  '其他跨境地产相关合作'
];

const prepGroups = [
  {
    title: '如果你是投资人',
    items: ['你关注的城市或项目类型', '预计资金规模区间', '投资周期预期', '风险承受能力', '是否已经有具体项目资料']
  },
  {
    title: '如果你是项目方',
    items: ['项目基本介绍', '项目位置与阶段', '土地、审批、permit 或 entitlement 状态', '资金需求和资本结构', '已有投资人材料或项目 deck']
  },
  {
    title: '如果你是新移民家庭或企业主',
    items: ['当前在美国的身份和居住状态（可选）', '家庭资产配置目标', '是否关注房地产、保险、现金流或长期保障', '是否已有顾问团队', '希望解决的核心问题']
  }
];

const processSteps = [
  {
    title: '初步查看需求',
    body: '我们会先判断需求类型、项目阶段和资料完整度。'
  },
  {
    title: '判断是否适合继续沟通',
    body: '不是所有项目都会进入深度合作。我们更重视真实性、透明度、风险可控性和长期合作价值。'
  },
  {
    title: '明确下一步服务方式',
    body: '可能进入项目初筛、深度尽调、合作结构讨论、资产配置咨询或项目合作沟通。'
  },
  {
    title: '必要时引入专业人士',
    body: '涉及法律、税务、贷款、保险、证券、移民等专业问题时，应由相应持牌或专业人士参与。'
  }
];

const relatedEntries = [
  { title: '服务产品矩阵', href: '/zh/services' },
  { title: '合作方案', href: '/zh/solutions' },
  { title: '项目与案例', href: '/zh/projects/' },
  { title: '项目判断服务', href: '/zh/services/strategy' }
];

const primaryButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border border-ink bg-ink px-5 py-3 text-center font-sans text-sm font-semibold leading-none text-white transition-colors duration-150 hover:bg-black sm:w-auto';

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-4xl">
      <p className="font-sans text-sm font-semibold text-gold">{eyebrow}</p>
      <h2 className="mt-3 font-sans text-2xl font-bold leading-tight md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-sm leading-7 text-muted md:text-base">{subtitle}</p> : null}
    </div>
  );
}

export default function ContactPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Contact</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">提交项目或合作需求</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            如果你正在判断一个美国房地产项目、寻找项目合作、配置美国资产，或希望了解 SAREC 的服务产品，可以先提交基本信息。我们会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。
          </p>
          <div className="mt-10">
            <a className={primaryButtonClass} href="#inquiry-form">
              开始提交需求
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Situations" title="什么情况下适合联系我们？" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {situations.map((item) => (
              <Card key={item.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader eyebrow="Requests" title="你可以提交哪些类型的需求？" />
          <Card>
            <div className="grid gap-3 text-sm leading-7 text-muted md:text-base">
              {requestTypes.map((item) => (
                <p className="border-l-2 border-gold pl-4" key={item}>
                  {item}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Preparation" title="为了提高沟通效率，建议提前准备以下信息" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {prepGroups.map((group) => (
              <Card key={group.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug">{group.title}</h3>
                <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
                  {group.items.map((item) => (
                    <li className="border-l-2 border-line pl-4" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24" id="inquiry-form">
        <div className="container-shell">
          <SectionHeader
            eyebrow="Form"
            title="提交项目或合作需求"
            subtitle="你可以简单说明你的身份、项目阶段、合作需求或希望咨询的问题。SAREC 会根据资料完整度、项目阶段和合作可能性，判断下一步是否适合继续沟通。"
          />
          <div className="mt-10">
            <ContactInquiryForm />
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Process" title="提交后，我们通常会如何判断？" />
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {processSteps.map((item, index) => (
              <Card key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">Step {index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Notice" title="重要说明" />
          <Card>
            <p className="text-muted">
              SAREC 提供的是项目判断、结构建议、资源协同和合作推进服务。房地产投资、项目开发、融资、保险、税务、法律和跨境交易均存在风险。具体交易应结合律师、会计师、贷款机构、保险顾问、持牌专业人士及相关合规主体的意见后审慎决策。
            </p>
          </Card>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Explore" title="你也可以先了解这些内容" />
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

      <section className="bg-deep py-12 text-white md:py-24">
        <div className="container-shell grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
          <div>
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">一次清晰的沟通，往往比盲目推进更重要。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
              如果你不确定项目是否值得继续看，或者不知道该从哪里开始，可以先提交基本信息。我们会根据实际情况判断下一步是否适合沟通。
            </p>
          </div>
          <div className="md:justify-self-end">
            <a className={primaryButtonClass} href="/zh/solutions">
              查看合作方案
            </a>
          </div>
        </div>
      </section>
    </article>
  );
}
