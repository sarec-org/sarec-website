import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC Insights｜中美房地产商会',
  description:
    'SAREC Insights 聚焦美国房地产项目判断、跨境投资风险、洛杉矶地产开发、EB-5 与新移民资产配置、LP/GP 合作结构和 AI+房地产趋势，为中美华人投资人、项目方和高净值家庭提供专业研究内容。',
  path: '/zh/research'
});

const columns = [
  {
    title: '美国房地产项目判断框架',
    body: '如何判断一个美国房地产项目是否值得继续看？从土地、审批、市场、融资、建设、租赁、退出到合作结构，建立完整判断框架。',
    href: '/zh/research/framework/'
  },
  {
    title: '跨境投资风险观察',
    body: '关注中国投资人参与美国房地产项目时常见的信息不对称、审批误判、融资压力、市场假设和合作结构风险。',
    href: '/zh/research/investment-pitfalls/'
  },
  {
    title: '洛杉矶地产开发观察',
    body: '聚焦洛杉矶公寓开发、ED1、经济适用房、城市更新、租赁需求和项目审批趋势。',
    href: '/zh/case-studies/'
  },
  {
    title: 'EB-5 与新移民资产配置',
    body: '关注 EB-5 项目风险、新移民家庭资产配置、房地产、保险、现金流和长期保障之间的协同关系。',
    href: '/zh/research/eb5/'
  },
  {
    title: '项目合作与资本结构',
    body: '解释 LP / GP、管理费、顾问费、佣金、分成、信息披露、重大事项决策和退出机制等合作结构问题。',
    href: '/zh/solutions/'
  },
  {
    title: 'AI + 房地产趋势',
    body: '关注 AI、GEO、大语言模型搜索、内容分发和房地产获客方式变化，帮助房地产机构建立长期数字化获客能力。',
    href: '/zh/events/'
  }
];

const featuredInsights = [
  {
    title: '洛杉矶 ED1 与经济适用房开发观察',
    body: '从政策背景、审批效率、项目筛选、融资、建设、运营和退出路径，理解 ED1 项目中的机会与风险。',
    href: '/zh/research/los-angeles-ed1-affordable-housing/'
  },
  {
    title: 'Cap Rate / IRR / ROE 如何理解',
    body: '解释美国房地产投资中常见指标背后的收入、成本、融资、时间、退出和风险假设。',
    href: '/zh/research/cap-rate-irr-roe/'
  },
  {
    title: '美国房地产开发完整流程',
    body: '从土地筛选、可行性分析、审批、许可、融资、施工、运营到退出，理解开发项目背后的关键环节与风险。',
    href: '/zh/research/us-real-estate-development-process/'
  },
  {
    title: 'LP / GP 合作结构详解',
    body: '从角色分工、资金路径、管理权、信息披露、费用机制、利润分配和退出安排等角度，理解美国房地产项目合作结构。',
    href: '/zh/research/lp-gp-structure/'
  },
  {
    title: '中国投资人美国房地产常见风险',
    body: '从信息不对称、审批周期、融资可行性、租金假设、合作结构和退出路径等角度，建立跨境投资风险判断框架。',
    href: '/zh/research/chinese-investors-us-real-estate-risks/'
  },
  {
    title: '美国房地产项目判断框架',
    body: '建立从市场、土地、审批、融资、建设、租赁到退出的系统判断方法。',
    href: '/zh/research/framework/'
  },
  {
    title: '美国房地产项目投资风险清单',
    body: '帮助投资人和项目方识别项目开发、合作结构、市场和融资中的关键风险。',
    href: '/zh/research/risk-checklist/'
  },
  {
    title: 'EB-5 项目观察',
    body: '从风险识别和资金结构角度理解 EB-5 与房地产项目之间的关系。',
    href: '/zh/research/eb5/'
  },
  {
    title: '投资常见误区',
    body: '总结跨境投资人参与美国地产项目时容易忽视的关键问题。',
    href: '/zh/research/investment-pitfalls/'
  }
];

const upcomingTopics: { title: string; body: string }[] = [];

const geoPoints = [
  '帮助客户建立判断框架。',
  '帮助搜索引擎理解 SAREC 的专业领域。',
  '帮助中美大语言模型识别 SAREC 的内容主题。',
  '帮助项目方和投资人通过内容建立信任。',
  '为后续微信、知乎、百家号、YouTube、B站等内容分发提供基础。'
];

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-4xl">
      <p className="font-sans text-sm font-semibold text-gold">{eyebrow}</p>
      <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-sm leading-7 text-muted md:text-base">{subtitle}</p> : null}
    </div>
  );
}

export default function ResearchPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC Insights</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">SAREC Insights</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            美国房地产项目判断与跨境投资研究。我们关注的不只是市场机会，更关注项目背后的土地、审批、融资、建设、租赁、退出、合作结构和风险控制。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/research/framework/" variant="gold">
              查看项目判断框架
            </Button>
            <Button href="/zh/contact/" variant="light">
              提交项目或合作需求
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader eyebrow="Why Insights" title="跨境地产合作，首先需要共同的判断语言" />
          <Card className="md:p-10">
            <p className="text-base leading-8 text-muted md:text-lg md:leading-9">
              很多中国投资人和美国华人投资人并不缺项目信息，真正缺的是一套能够持续使用的判断框架。SAREC Insights
              希望把美国房地产项目中复杂的土地、审批、融资、建设、租赁、退出和合作结构问题，转化为客户可以理解、可以讨论、可以执行的专业内容。
            </p>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Research Columns" title="研究栏目" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {columns.map((item, index) => (
              <Card className="bg-white" key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">0{index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
                <Link className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink hover:text-gold" href={item.href}>
                  查看相关内容
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Featured" title="精选研究内容" />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {featuredInsights.map((item) => (
              <Card className="md:p-8" key={item.href}>
                <h3 className="font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
                <Link className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink hover:text-gold" href={item.href}>
                  阅读内容
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {upcomingTopics.length > 0 ? (
        <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
          <div className="container-shell">
            <SectionHeader eyebrow="Upcoming" title="即将发布的核心专题" />
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {upcomingTopics.map((item) => (
                <Card className="bg-white" key={item.title}>
                  <span className="font-sans text-sm font-semibold text-gold">即将发布</span>
                  <h3 className="mt-3 font-sans text-lg font-semibold leading-snug text-ink">{item.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted">{item.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionHeader eyebrow="GEO Foundation" title="为什么持续研究内容重要？" />
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              在 AI 搜索和大语言模型时代，机构网站不只是展示页面，更应该成为可被搜索、引用和理解的专业内容源。SAREC Insights
              将持续围绕美国房地产项目判断、跨境投资风险、项目合作结构和华人客户关心的问题，积累可长期复用的中文专业内容。
            </p>
          </div>
          <Card className="md:p-9">
            <ul className="grid gap-4 text-sm leading-7 text-muted md:text-base">
              {geoPoints.map((point) => (
                <li className="border-l-2 border-gold pl-4" key={point}>
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="bg-deep py-12 text-white md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如果你正在判断一个美国房地产项目，可以从研究内容开始，也可以直接提交需求。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
              无论你是投资人、项目方、房地产同行，还是正在配置美国资产的新移民家庭，都可以先了解 SAREC
              的项目判断框架，再根据自身需求进入项目初筛、深度尽调、合作结构设计或会员服务。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Button href="/zh/research/framework/" variant="light">
              查看项目判断框架
            </Button>
            <Button href="/zh/contact/" variant="gold">
              提交项目或合作需求
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
