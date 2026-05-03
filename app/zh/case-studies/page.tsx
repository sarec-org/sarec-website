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
    title: '项目初筛案例｜一个看起来收益很高的开发项目',
    body: '用于说明为什么项目材料中的亮点需要回到土地、审批、成本、融资和退出假设中逐项验证。'
  },
  {
    title: '风控案例｜合作结构比项目本身更重要',
    body: '用于说明项目方、资金方、管理权、信息披露、重大事项决策和退出机制如何影响合作质量。'
  },
  {
    title: '资本协同案例｜好项目也需要被正确表达',
    body: '用于说明项目方如何把复杂项目转化为可以讨论、可以判断、可以推进的合作方案。'
  }
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
              <h3 className="mt-6 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">4136 Rosewood｜洛杉矶精品公寓开发项目</h3>
              <p className="mt-5 max-w-4xl text-base leading-8 text-muted md:text-lg md:leading-9">
                4136 Rosewood 是一个位于洛杉矶成熟社区的精品公寓开发项目，规划约 69
                个公寓单元、6 层建筑，适合用于说明美国城市公寓开发项目从土地、审批、成本、融资、租赁到退出的系统判断逻辑。
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
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {anonymizedCases.map((item) => (
              <Card key={item.title}>
                <span className="font-sans text-sm font-semibold text-gold">脱敏案例即将上线</span>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
              </Card>
            ))}
          </div>
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
