import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '4136 Rosewood 案例研究｜SAREC 中美房地产商会',
  description:
    '4136 Rosewood 是洛杉矶 East Hollywood 的 ED1 经济适用房开发项目案例，用于说明美国城市住宅开发项目的土地、审批、成本、融资、租赁、退出和合作结构判断逻辑。',
  path: '/zh/case-studies/4136-rosewood'
});

const tags = ['真实项目案例', 'ED1 经济适用房', '项目判断', '风险识别'];

const overview = [
  ['项目类型', 'ED1 经济适用房开发'],
  ['项目位置', '洛杉矶成熟社区'],
  ['项目规模', '约 69 个公寓单元，6 层建筑'],
  ['建筑规模', '约 34,500 平方英尺'],
  ['项目定位', '符合 ED1 政策的洛杉矶城市住宅开发产品，单元面向 LA 区域工薪与中等收入家庭。'],
  ['项目阶段', '项目已完成关键审批节点，进入实质推进阶段。具体开工安排、融资条件和项目进展，应以项目最新资料为准。']
];

const studyValuePoints = [
  '项目位于成熟城市社区，适合讨论区位和租赁需求。',
  '项目规模适中，既具备开发复杂度，也便于进行系统分析。',
  '项目涉及土地、审批、建设、融资、运营和退出等完整开发链条。',
  '项目适合说明投资人如何从财务模型回到项目真实逻辑。'
];

const framework = [
  {
    title: '市场与位置',
    body: '成熟社区、公寓租赁需求、目标客群收入水平、周边供给和区域长期稳定性，是判断租赁型公寓项目的基础。'
  },
  {
    title: '土地与审批',
    body: '土地状态、分区、entitlement、permit、政策环境和审批进度，直接决定项目能否从概念进入真实开发。'
  },
  {
    title: '建设与成本',
    body: '硬成本、软成本、设计、施工周期、承包商履约、成本超支和 contingency，都会影响项目最终结果。'
  },
  {
    title: '融资与资本结构',
    body: '股权资金、建筑贷款、利率、资金到位时间、再融资可能性和资本结构安排，是项目推进的关键。'
  },
  {
    title: '租赁与退出',
    body: '租金假设、空置率、运营成本、cap rate、出售或长期持有路径，决定项目完成后的价值实现。'
  },
  {
    title: '合作与风控',
    body: '谁管理项目、谁负责信息披露、重大事项如何决策、延期和超支如何处理、投资人如何获得透明信息，决定合作是否稳健。'
  }
];

const modelQuestions = [
  '租金假设是否来自真实市场比较。',
  '建设成本是否有充分依据。',
  '运营费用是否足够保守。',
  '空置率和管理费是否被充分考虑。',
  'cap rate 和退出价值是否过于乐观。',
  '如果成本上升、租金下降或退出延后，项目是否仍然具有安全边际。'
];

const risks = [
  {
    title: '审批与开工节奏',
    body: '即使项目已经完成关键审批节点，实际开工仍可能受到施工准备、资金安排和市场条件影响。'
  },
  {
    title: '建设成本控制',
    body: '公寓开发对硬成本、软成本和时间成本敏感，成本超支会直接影响项目结果。'
  },
  {
    title: '融资环境变化',
    body: '利率、贷款条件、建筑贷款安排和再融资市场变化，都会影响项目资金结构。'
  },
  {
    title: '租赁市场变化',
    body: '租金假设、出租速度和空置率变化，会影响项目现金流和估值。'
  },
  {
    title: '退出市场变化',
    body: '项目完成后的出售价格、cap rate 和买家需求，可能与最初测算存在差异。'
  },
  {
    title: '合作结构安排',
    body: '投资人是否能获得及时信息、重大事项是否有清晰机制、各方权责是否明确，是项目合作的重要保障。'
  }
];

const takeaways = [
  '项目规模越大，越需要完整判断体系。',
  '收益测算越吸引人，越需要回到假设和风险。',
  '项目方执行能力和信息透明度非常重要。',
  '跨境投资人需要用美国本地规则判断项目。',
  'SAREC 的价值是帮助客户建立判断框架，而不是简单介绍项目。'
];

const relatedLinks = [
  {
    title: '项目初筛与投资判断',
    href: '/zh/services/strategy/'
  },
  {
    title: '服务架构',
    href: '/zh/services/'
  },
  {
    title: '风险披露',
    href: '/zh/legal/risk-disclosure/'
  },
  {
    title: '会员服务',
    href: '/zh/membership/'
  }
];

function SectionShell({ eyebrow, title, children, muted = false }: { eyebrow?: string; title: string; children: ReactNode; muted?: boolean }) {
  return (
    <section className={muted ? 'border-y border-line bg-zinc-50 py-12 md:py-24' : 'py-12 md:py-24'}>
      <div className="container-shell">
        <div className="max-w-4xl">
          {eyebrow ? <p className="font-sans text-sm font-semibold text-gold">{eyebrow}</p> : null}
          <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function NumberBadge({ value }: { value: number }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-deep font-sans text-sm font-semibold text-gold">
      {value}
    </span>
  );
}

export default function RosewoodCaseStudyPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Case Study</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">4136 Rosewood｜洛杉矶 East Hollywood · ED1 经济适用房开发</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            一个美国城市公寓开发项目，真正值得研究的不只是项目规模和收益测算，而是土地、审批、建设、融资、租赁、退出和合作结构背后的系统判断。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span className="rounded-[2px] border border-white/15 bg-white/5 px-3 py-1.5 font-sans text-xs font-semibold text-zinc-300" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/contact/" variant="gold">
              提交项目或合作需求
            </Button>
            <Button href="/zh/services/" variant="light">
              查看服务架构
            </Button>
          </div>
        </div>
      </section>

      <SectionShell eyebrow="Overview" title="项目概览">
        <dl className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.map(([label, value]) => (
            <div className="rounded-md border border-line bg-white p-5 shadow-soft md:p-6" key={label}>
              <dt className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">{label}</dt>
              <dd className="mt-3 text-sm leading-7 text-muted md:text-base">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionShell>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Why It Matters</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">这个案例的价值，不只是一个项目本身</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              4136 Rosewood
              适合用于说明美国城市公寓开发项目的完整判断逻辑。对于跨境投资人而言，真正重要的不是只看项目介绍或收益测算，而是理解项目从土地获取、审批推进、建设成本、租赁假设、退出路径到合作结构的每一个关键环节。
            </p>
          </div>
          <ol className="grid gap-4">
            {studyValuePoints.map((item, index) => (
              <li className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[2.5rem_1fr] md:p-5" key={item}>
                <NumberBadge value={index + 1} />
                <p className="text-sm leading-7 text-muted md:text-base">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SectionShell eyebrow="Framework" title="我们如何看这个项目">
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {framework.map((item, index) => (
            <Card key={item.title}>
              <NumberBadge value={index + 1} />
              <h3 className="mt-5 font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Financial Assumptions</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">财务模型不是答案，而是需要被验证的假设集合</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              Rosewood 项目内部模型包含成本、租金、费用、现金流、cap rate、退出价值等多个假设。对于投资人而言，关键不是记住一个收益数字，而是理解这些数字背后的假设是否合理。
            </p>
          </div>
          <ol className="grid gap-4">
            {modelQuestions.map((item, index) => (
              <li className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[2.5rem_1fr] md:p-5" key={item}>
                <NumberBadge value={index + 1} />
                <p className="text-sm leading-7 text-muted md:text-base">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SectionShell eyebrow="Risk Review" title="一个好项目，也必须先看风险">
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {risks.map((risk, index) => (
            <Card key={risk.title}>
              <NumberBadge value={index + 1} />
              <h3 className="mt-5 font-sans text-xl font-semibold leading-snug text-ink">{risk.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted md:text-base">{risk.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Takeaways</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">Rosewood 对跨境投资人的启发</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              4136 Rosewood
              说明，判断美国房地产项目不能只看收益表，也不能只听项目方介绍。真正专业的判断，需要把项目拆解为土地、审批、成本、融资、租赁、退出和合作结构，并在每一个环节提出正确问题。
            </p>
          </div>
          <ol className="grid gap-4">
            {takeaways.map((item, index) => (
              <li className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[2.5rem_1fr] md:p-5" key={item}>
                <NumberBadge value={index + 1} />
                <p className="text-sm leading-7 text-muted md:text-base">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <Card className="border-gold/40 md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">重要说明</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">重要说明</h2>
            <p className="mt-6 text-base leading-8 text-muted md:text-lg md:leading-9">
              本案例仅用于说明美国房地产项目判断、风险识别和合作结构分析方法，不构成投资建议、证券发行、收益承诺、融资承诺或项目合作邀请。项目相关数据、阶段和条件可能随时间变化，具体交易应以最新项目资料、合同文件和相关专业人士意见为准。
            </p>
          </Card>
        </div>
      </section>

      <SectionShell eyebrow="Related" title="相关入口" muted>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {relatedLinks.map((item) => (
            <Link className="group block rounded-md border border-line bg-white p-5 shadow-soft transition duration-150 hover:-translate-y-0.5 hover:border-zinc-400 md:p-6" href={item.href} key={item.href}>
              <h3 className="font-sans text-lg font-semibold leading-snug text-ink group-hover:text-gold">{item.title}</h3>
              <span className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink group-hover:text-gold">前往查看</span>
            </Link>
          ))}
        </div>
      </SectionShell>

      <section className="border-t border-line bg-deep py-12 text-white md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如果你正在判断一个美国房地产项目，可以先从项目初筛开始。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
              无论你已经看到一个项目，还是希望了解美国房地产开发的判断逻辑，都可以提交资料或需求。SAREC
              会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Button href="/zh/contact/" variant="light">
              提交项目或合作需求
            </Button>
            <Button href="/zh/services/strategy/" variant="gold">
              查看项目判断服务
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
