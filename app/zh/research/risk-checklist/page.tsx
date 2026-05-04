import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '美国房地产项目投资风险清单｜SAREC Insights',
  description:
    '本文整理美国房地产项目投资和开发中常见的土地、审批、融资、建设、租赁、退出、合作结构和信息披露风险，帮助中国投资人和美国华人投资人建立项目初筛清单。',
  path: '/zh/research/risk-checklist',
  type: 'article'
});

const tags = ['SAREC Insights', '风险清单', '项目初筛', '美国房地产', '跨境投资'];

const riskModules = [
  {
    title: '土地与权属风险',
    checks: [
      '土地权属是否清楚',
      '是否存在 lien、easement、encumbrance 或其他限制',
      '地块形状、面积、临街条件是否支持开发',
      '是否涉及历史资源、环保、高火险区或特殊限制',
      '土地价格是否已经透支开发利润'
    ]
  },
  {
    title: 'Zoning 与审批风险',
    checks: [
      '当前 zoning 是否支持项目用途',
      '是否需要 entitlement、variance、density bonus 或其他申请',
      '当前处于什么审批阶段',
      'Plan Check 是否完成',
      'RTI / Permit 状态是否真实',
      '是否还有消防、公用事业、交通、停车等未解决问题'
    ]
  },
  {
    title: '市场与租金假设风险',
    checks: [
      '目标客群是否清楚',
      '租金或售价是否来自真实可比项目',
      '微区位是否支持目标产品',
      '周边同类供给是否过多',
      '空置率是否充分考虑',
      '市场下行时项目是否仍有安全边际'
    ]
  },
  {
    title: '建设成本与工期风险',
    checks: [
      '是否有完整 hard cost 和 soft cost',
      '是否有 GC 报价',
      '报价是否包含 excluded items',
      'contingency 是否充分',
      '工期是否过于乐观',
      '施工延期和 change order 如何处理'
    ]
  },
  {
    title: '融资与资金路径风险',
    checks: [
      '股权资金是否到位',
      '建筑贷款是否已有 term sheet 或明确沟通',
      '贷款条件是否可执行',
      '利息储备是否充分',
      '资金进入哪个主体',
      '超支时谁追加资金',
      '再融资是否过于依赖市场乐观假设'
    ]
  },
  {
    title: 'LP / GP 合作结构风险',
    checks: [
      '谁是真正的 GP 或管理方',
      'LP 有哪些信息权和监督权',
      '重大事项是否需要投资人同意',
      '管理费、开发费、顾问费和分成是否清楚',
      '关联方交易是否披露',
      '项目延期、超支、融资失败时如何处理'
    ]
  },
  {
    title: '信息披露风险',
    checks: [
      '是否有月度或季度报告机制',
      '是否披露预算和实际支出对比',
      '是否披露审批和施工进度',
      '是否披露重大风险变化',
      '是否有年度财务报告',
      '投资人是否能及时获得真实资料'
    ]
  },
  {
    title: '退出风险',
    checks: [
      '项目计划出售、再融资还是长期持有',
      '退出 cap rate 是否合理',
      '买家或再融资市场是否真实存在',
      '如果市场不好，是否可以延长持有',
      '退出决策由谁决定',
      '税务和交易成本是否考虑'
    ]
  }
];

const screeningFocus = [
  '项目资料完整度',
  '当前审批阶段',
  '成本与融资依据',
  '市场假设是否可验证',
  '合作结构是否清楚',
  '是否需要律师、会计师、贷款机构、保险顾问或其他专业人士参与'
];

const relatedEntries = [
  { title: '中国投资人美国房地产常见风险', href: '/zh/research/chinese-investors-us-real-estate-risks/' },
  { title: 'LP / GP 合作结构详解', href: '/zh/research/lp-gp-structure/' },
  { title: '美国房地产开发完整流程', href: '/zh/research/us-real-estate-development-process/' },
  { title: '案例研究', href: '/zh/case-studies/' }
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

export default function RiskChecklistPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC Insights</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">美国房地产项目投资风险清单</h1>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            美国房地产项目不是只看位置、租金和收益测算。真正的项目初筛，需要从土地、审批、融资、建设、运营、退出和合作结构等多个维度逐项验证。
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span className="rounded-full border border-white/20 px-3 py-1 font-sans text-xs font-semibold text-zinc-200" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/services/strategy/" variant="gold">
              提交项目初筛
            </Button>
            <Button href="/zh/legal/risk-disclosure/" variant="light">
              查看风险披露
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell max-w-5xl">
          <SectionHeader eyebrow="Introduction" title="风险清单的意义，是把关键问题提前问清楚" />
          <p className="mt-6 text-sm leading-7 text-muted md:text-base">
            很多项目在介绍材料里看起来很完整，但真正进入尽调时，问题往往出现在细节里。风险清单的意义，不是为了否定项目，而是帮助投资人和项目方在早期阶段把关键问题问清楚，避免在审批、融资、建设或退出阶段才发现重大不确定性。
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Checklist" title="风险清单主体" />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {riskModules.map((module, index) => (
              <Card className="md:p-8" key={module.title}>
                <p className="font-sans text-sm font-semibold text-gold">Module {index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug text-ink">{module.title}</h3>
                <ul className="mt-6 grid gap-3 text-sm leading-7 text-muted md:text-base">
                  {module.checks.map((check) => (
                    <li className="border-l-2 border-gold pl-4" key={check}>
                      {check}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader eyebrow="Principle" title="风险清单不是为了拖慢项目，而是为了提高判断质量" />
          <Card>
            <p className="text-sm leading-7 text-muted md:text-base">
              一个项目如果经不起这些基础问题的询问，说明它还不适合进入深度合作。一个项目如果能够逐项回答这些问题，才更值得进入下一步尽调、结构设计和资源协同。
            </p>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionHeader eyebrow="SAREC Framework" title="SAREC 如何帮助客户做项目初筛？" />
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              SAREC 会根据客户提供的项目资料，围绕土地、审批、融资、建设、租赁、退出和合作结构进行初步梳理。项目初筛不等于最终投资判断，而是帮助客户判断资料是否完整、风险是否清楚、下一步是否值得继续推进。
            </p>
          </div>
          <Card>
            <p className="font-sans text-sm font-semibold text-gold">初筛关注</p>
            <ul className="mt-5 grid gap-3 text-sm leading-7 text-muted md:text-base">
              {screeningFocus.map((item) => (
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
          <SectionHeader eyebrow="Notice" title="重要说明" />
          <Card>
            <p className="text-sm leading-7 text-muted md:text-base">
              本文仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。房地产投资、项目开发、融资、税务、保险、法律和跨境交易均涉及复杂风险。具体事项应结合项目资料、合同文件和相关持牌或专业人士意见审慎判断。
            </p>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Related" title="相关入口" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {relatedEntries.map((item) => (
              <Card key={item.href}>
                <h3 className="font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
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
            <h2 className="font-sans text-2xl font-bold leading-tight md:text-4xl">如果你正在看一个美国房地产项目，可以先做一次风险清单初筛。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
              你可以提交项目资料、审批状态、预算、融资计划或合作需求。SAREC 会根据资料完整度和项目阶段，判断下一步是否适合继续沟通。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <Button href="/zh/services/strategy/" variant="gold">
              提交项目初筛
            </Button>
            <Button href="/zh/contact#inquiry-form" variant="light">
              联系我们
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
