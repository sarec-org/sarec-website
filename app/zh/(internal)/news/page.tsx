import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...createPageMetadata({
    title: '新闻与研究动态｜SAREC 中美房地产商会',
    description:
      '查看 SAREC 中美房地产商会的研究内容、项目观察、活动更新和美国房地产市场观点，涵盖跨境投资风险、LP/GP 合作结构、开发流程、ED1 政策和项目案例研究。',
    path: '/zh/news'
  }),
  robots: { index: false, follow: false }
};

const latestResearch = [
  {
    title: '中国投资人美国房地产常见风险',
    href: '/zh/research/chinese-investors-us-real-estate-risks/',
    description: '从信息不对称、审批周期、融资可行性、租金假设、合作结构和退出路径等角度，建立跨境投资风险判断框架。'
  },
  {
    title: 'LP / GP 合作结构详解',
    href: '/zh/research/lp-gp-structure/',
    description: '理解美国房地产项目合作结构中的角色分工、资金路径、信息披露、费用机制和退出安排。'
  },
  {
    title: '美国房地产开发完整流程',
    href: '/zh/research/us-real-estate-development-process/',
    description: '从土地筛选、审批、许可、融资、施工、运营到退出，理解开发项目背后的关键环节。'
  },
  {
    title: 'Cap Rate / IRR / ROE 如何理解',
    href: '/zh/research/cap-rate-irr-roe/',
    description: '解释房地产投资指标背后的收入、成本、融资、时间、退出和风险假设。'
  },
  {
    title: '洛杉矶 ED1 与经济适用房开发观察',
    href: '/zh/research/los-angeles-ed1-affordable-housing/',
    description: '从政策背景、审批效率、项目筛选、融资、建设、运营和退出路径，理解 ED1 项目中的机会与风险。'
  }
];

const caseUpdates = [
  {
    title: '案例研究',
    href: '/zh/case-studies/',
    description: '查看 SAREC 如何通过真实项目和脱敏案例说明项目判断、风险识别和合作结构分析。'
  },
  {
    title: '4136 Rosewood 深度案例',
    href: '/zh/case-studies/4136-rosewood/',
    description: '通过洛杉矶 East Hollywood 的 ED1 经济适用房开发项目，理解土地、审批、成本、融资、租赁、退出和合作结构判断。'
  }
];

const activityUpdates = [
  {
    title: '活动与考察培训',
    href: '/zh/events/',
    description: '了解美国房地产项目考察、主题培训、闭门交流和会员活动安排。'
  },
  {
    title: '会员服务',
    href: '/zh/membership/',
    description: '加入 SAREC 长期专业网络，获取内容、活动、资源协同和项目交流机会。'
  }
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

function EntryGrid({ items }: { items: { title: string; href: string; description: string }[] }) {
  return (
    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.href}>
          <h3 className="font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
          <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.description}</p>
          <a className="mt-6 inline-flex border-b border-gold pb-1 font-sans text-sm font-semibold text-ink hover:text-gold" href={item.href}>
            前往查看
          </a>
        </Card>
      ))}
    </div>
  );
}

export default function NewsPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC Updates</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">新闻与研究动态</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            SAREC 持续围绕美国房地产项目判断、跨境投资风险、洛杉矶开发政策、项目案例和会员活动，发布研究内容与机构动态。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/research/" variant="gold">
              查看 SAREC Insights
            </Button>
            <Button href="/zh/case-studies/" variant="light">
              查看案例研究
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Research" title="最新研究内容" />
          <EntryGrid items={latestResearch} />
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Case Studies" title="项目与案例更新" />
          <EntryGrid items={caseUpdates} />
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Events & Membership" title="活动与会员动态" />
          <EntryGrid items={activityUpdates} />
        </div>
      </section>

      <section className="bg-deep py-12 text-white md:py-24">
        <div className="container-shell grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-end">
          <div>
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">
              如果你希望了解美国房地产项目机会、风险和合作方式，可以从研究内容开始，也可以直接提交需求。
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Button href="/zh/contact#inquiry-form" variant="gold">
              提交项目或合作需求
            </Button>
            <Button href="/zh/services/" variant="light">
              查看服务产品
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
