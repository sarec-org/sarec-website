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

const featuredTags = ['真实项目案例', '精品公寓开发', '洛杉矶成熟社区', '项目判断案例'];

const upcomingCases = [
  '项目初筛案例｜一个看起来收益很高的开发项目',
  '风控案例｜合作结构比项目本身更重要',
  '资本协同案例｜好项目也需要被正确表达'
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
            <p className="font-sans text-sm font-semibold text-gold">Cases</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">案例列表</h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="bg-white md:p-10">
              <div className="flex flex-wrap gap-2">
                {featuredTags.map((tag) => (
                  <span className="rounded-[2px] border border-line bg-zinc-50 px-3 py-1.5 font-sans text-xs font-semibold text-muted" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="mt-6 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">4136 Rosewood｜洛杉矶精品公寓开发项目</h3>
              <p className="mt-5 max-w-4xl text-base leading-8 text-muted md:text-lg md:leading-9">
                4136 Rosewood 是一个位于洛杉矶成熟社区的精品公寓开发项目，规划约 69
                个公寓单元、6 层建筑，适合用于说明美国城市公寓开发项目从土地、审批、成本、融资、租赁到退出的系统判断逻辑。
              </p>
              <div className="mt-8">
                <Button href="/zh/case-studies/4136-rosewood/">查看案例</Button>
              </div>
            </Card>

            <div className="grid gap-5">
              {upcomingCases.map((title) => (
                <Card className="bg-white" key={title}>
                  <span className="font-sans text-sm font-semibold text-gold">脱敏案例即将上线</span>
                  <h3 className="mt-3 font-sans text-xl font-semibold leading-snug text-ink">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted">案例内容将用于说明项目判断、风险识别与合作结构，不展示具体人名、地址、金额和收益数据。</p>
                </Card>
              ))}
            </div>
          </div>
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
