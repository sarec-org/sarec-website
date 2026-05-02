import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '活动与考察培训｜SAREC 中美房地产商会',
  description:
    'SAREC 活动与考察培训面向中美房地产投资人、项目方、房地产从业者、新移民家庭和跨境企业主，提供美国房地产项目考察、主题培训、闭门交流和资源协同机会。',
  path: '/zh/events'
});

const audiences = [
  {
    title: '中国企业家与投资人',
    body: '希望系统了解美国房地产市场、项目开发逻辑、投资风险和跨境合作路径。'
  },
  {
    title: '美国华人投资人',
    body: '希望参与美国房地产项目，但需要更清楚地理解项目判断、风险识别和合作结构。'
  },
  {
    title: '新移民家庭与高净值客户',
    body: '希望围绕美国房地产、保险、现金流和长期保障，建立更稳健的家庭资产配置框架。'
  },
  {
    title: '房地产开发商与项目方',
    body: '希望接触跨境资本、优化项目表达，并与潜在投资人和资源方建立沟通。'
  },
  {
    title: '房地产相关行业人士',
    body: '包括经纪人、建材商、贷款、保险、设计、施工、物业管理等相关从业者，希望建立长期合作网络。'
  },
  {
    title: '专业服务机构',
    body: '包括律师、会计师、贷款机构、保险顾问、税务顾问、移民服务等，希望服务中美跨境地产客户。'
  }
];

const eventFormats = [
  {
    title: '美国房地产项目考察',
    body: '围绕洛杉矶、尔湾及其他重点城市的住宅、公寓、商业地产、开发项目和社区环境，组织项目参访与现场讲解。'
  },
  {
    title: '主题培训',
    body: '围绕美国房地产开发流程、项目尽调、LP/GP结构、融资与退出、EB-5风险、新移民资产配置等主题，进行系统讲解。'
  },
  {
    title: '企业家闭门交流',
    body: '面向投资人、项目方、企业主和专业服务资源，组织小范围深度交流，讨论项目机会、风险控制和合作路径。'
  },
  {
    title: '项目路演与案例讨论',
    body: '通过真实项目或脱敏案例，帮助参与者理解项目表达、投资人沟通、风险披露和合作结构设计。'
  },
  {
    title: '会员专属活动',
    body: '为 SAREC 会员提供优先活动通知、专题分享、项目讨论和资源协同机会。'
  }
];

const inspectionFocus = [
  '城市与区域逻辑',
  '社区环境与租赁需求',
  '土地和审批状态',
  '建设成本与开发周期',
  '融资结构与资金压力',
  '租金、出租速度和退出假设',
  '项目方执行能力',
  '投资人应重点关注的风险',
  '美国法律、合同和专业服务边界',
  '项目是否适合进一步沟通或合作'
];

const themes = [
  '美国房地产开发完整流程',
  '中国投资人美国地产常见风险',
  '如何判断一个美国地产项目是否值得继续看',
  'LP / GP 合作结构与投资人保护',
  'EB-5 投资与房地产项目风险',
  '新移民家庭的美国资产配置框架',
  '洛杉矶公寓开发机会与挑战',
  'AI、GEO 与房地产获客新趋势'
];

const collaborationPath = [
  '参加活动或考察',
  '初步理解美国房地产市场和项目逻辑',
  '与 SAREC 沟通自身需求',
  '进入会员服务或项目初筛',
  '根据情况进入深度尽调、结构设计或项目合作'
];

const relatedLinks = [
  {
    title: '会员服务',
    body: '了解如何加入 SAREC 会员网络，获取长期内容、活动和资源协同机会。',
    href: '/zh/membership/'
  },
  {
    title: '服务产品矩阵',
    body: '查看项目初筛、深度尽调、结构设计、项目合作和资产配置服务。',
    href: '/zh/services/'
  },
  {
    title: '项目与案例',
    body: '了解 SAREC 如何展示项目判断、风险识别和合作逻辑。',
    href: '/zh/projects/'
  },
  {
    title: '风险披露',
    body: '参与项目前，先了解美国房地产投资与跨境合作中的主要风险。',
    href: '/zh/legal/risk-disclosure/'
  }
];

function SectionShell({ eyebrow, title, children, muted = false }: { eyebrow?: string; title: string; children: ReactNode; muted?: boolean }) {
  return (
    <section className={muted ? 'border-y border-line bg-zinc-50 py-12 md:py-24' : 'py-12 md:py-24'}>
      <div className="container-shell">
        <div className="max-w-3xl">
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

export default function EventsPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC Events</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">用实地考察和深度交流，看懂美国房地产机会</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-xl">
            SAREC
            活动与考察培训面向中美房地产投资人、项目方、房地产从业者、新移民家庭和跨境企业主。我们通过美国房地产项目考察、主题培训、闭门交流和专业资源连接，帮助客户更清楚地理解美国房地产市场、项目风险、合作结构和长期资产配置路径。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/contact/" variant="gold">
              咨询下一期活动
            </Button>
            <Button href="/zh/membership/" variant="light">
              申请成为会员
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Why In Person</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">很多问题，只有走进项目现场才看得清</h2>
          </div>
          <Card className="md:p-10">
            <p className="text-base leading-8 text-muted md:text-lg md:leading-9">
              美国房地产项目不能只看材料、PPT 或收益测算。真正影响项目结果的，往往是城市位置、社区环境、土地状态、审批流程、建设成本、融资结构、租赁需求、退出路径和合作方执行能力。SAREC
              希望通过线下考察和专业交流，让投资人和项目方不只是“听别人介绍机会”，而是逐步建立自己的判断框架。
            </p>
          </Card>
        </div>
      </section>

      <SectionShell eyebrow="Audience" title="谁适合参加 SAREC 活动与考察？" muted>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {audiences.map((item) => (
            <Card className="bg-white" key={item.title}>
              <h3 className="font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Formats" title="SAREC 活动形式">
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventFormats.map((item, index) => (
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
            <p className="font-sans text-sm font-semibold text-gold">Inspection Logic</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">我们不把考察做成走马观花</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              SAREC
              更重视考察背后的判断价值。一次专业的美国房地产考察，不只是看几个项目，而是帮助参与者理解项目背后的城市、政策、资本、建设、运营和退出逻辑。
            </p>
          </div>
          <ol className="grid gap-4">
            {inspectionFocus.map((item, index) => (
              <li className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[2.5rem_1fr] md:p-5" key={item}>
                <NumberBadge value={index + 1} />
                <p className="text-sm leading-7 text-muted md:text-base">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SectionShell eyebrow="Topics" title="典型主题方向">
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {themes.map((theme, index) => (
            <Card key={theme}>
              <NumberBadge value={index + 1} />
              <h3 className="mt-5 font-sans text-lg font-semibold leading-snug text-ink">{theme}</h3>
            </Card>
          ))}
        </div>
      </SectionShell>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Long-Term Path</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">活动不是终点，而是建立信任的开始</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              SAREC
              的活动与考察，不是单次旅游式安排，而是长期合作网络的一部分。参与者可以通过活动先理解市场、认识资源、提出问题、建立信任，再根据自身需求进入会员服务、项目初筛、深度尽调、结构设计、项目合作或家庭资产配置咨询。
            </p>
          </div>
          <ol className="grid gap-4">
            {collaborationPath.map((item, index) => (
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
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">活动服务边界</h2>
            <p className="mt-6 text-base leading-8 text-muted md:text-lg md:leading-9">
              SAREC
              活动、考察和培训内容主要用于市场理解、项目判断、风险识别、资源交流和专业教育，不构成投资建议、证券发行、法律意见、税务意见、移民建议或收益承诺。参与任何具体项目、投资、融资、保险、移民或税务安排前，应结合相关持牌或专业人士意见审慎决策。
            </p>
          </Card>
        </div>
      </section>

      <SectionShell eyebrow="Related" title="你也可以先了解这些内容" muted>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {relatedLinks.map((item) => (
            <Link className="group block rounded-md border border-line bg-white p-5 shadow-soft transition duration-150 hover:-translate-y-0.5 hover:border-zinc-400 md:p-6" href={item.href} key={item.href}>
              <h3 className="font-sans text-lg font-semibold leading-snug text-ink group-hover:text-gold">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted">{item.body}</p>
            </Link>
          ))}
        </div>
      </SectionShell>

      <section className="border-t border-line bg-deep py-12 text-white md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如果你希望通过实地考察和深度交流理解美国房地产市场，可以先提交活动咨询。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
              无论你是中国企业家、美国华人投资人、房地产同行、项目方，还是正在配置美国资产的新移民家庭，都可以先提交你的活动或考察需求。SAREC
              会根据你的背景和目标，判断适合的活动形式和下一步沟通方式。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Button href="/zh/contact/" variant="light">
              咨询下一期活动
            </Button>
            <Button href="/zh/membership/" variant="gold">
              申请成为会员
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
