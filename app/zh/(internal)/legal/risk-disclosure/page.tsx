import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '风险披露｜SAREC 中美房地产商会',
  description:
    '了解美国房地产项目、跨境投资、项目开发、融资、退出和合作结构中可能涉及的主要风险。SAREC 提供项目判断、结构建议、资源协同与合作推进服务，但不承诺收益或交易结果。',
  path: '/zh/legal/risk-disclosure'
});

const realEstateRisks = [
  '市场风险：房地产价格、租金、空置率、cap rate 和买家需求可能随市场周期变化。',
  '开发风险：项目可能面临审批延迟、施工延期、成本超支、承包商履约问题和工程变更。',
  '融资风险：贷款审批、利率水平、贷款比例、再融资条件和资金到位时间均可能变化。',
  '出租与运营风险：出租速度、租金水平、运营成本、维修支出和物业管理效果可能影响实际现金流。',
  '退出风险：项目出售、再融资或长期持有的实际结果可能与原先假设不同。',
  '合作方风险：项目方、管理方、承包商、贷款机构或其他合作方的履约能力可能影响项目推进。'
];

const crossBorderRisks = [
  '中美法律、税务、金融、房地产制度差异可能导致理解偏差。',
  '投资人可能因语言、文化、文件理解和信息不对称而低估风险。',
  '跨境资金流动、汇率变化、税务安排和身份规划应由相关专业人士评估。',
  '中国投资人不能简单照搬中国房地产经验判断美国项目。',
  '美国项目应按照美国本地法律法规、合同机制和市场规则进行判断。'
];

function DisclosureSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-10 md:pt-12">
      <h2 className="font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">{title}</h2>
      <div className="mt-6 text-base leading-8 text-muted md:text-lg md:leading-9">{children}</div>
    </section>
  );
}

function OrderedRiskList({ items }: { items: string[] }) {
  return (
    <ol className="grid gap-4">
      {items.map((item, index) => (
        <li className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[2.5rem_1fr] md:p-5" key={item}>
          <span className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-deep font-sans text-sm font-semibold text-gold">
            {index + 1}
          </span>
          <p className="text-sm leading-7 text-muted md:text-base">{item}</p>
        </li>
      ))}
    </ol>
  );
}

export default function RiskDisclosurePage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Legal / Risk Disclosure</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">风险披露</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-xl">
            房地产投资、项目开发、跨境合作和资产配置均涉及风险。SAREC
            提供项目判断、结构建议、资源协同与合作推进服务，但任何项目机会都应在充分理解风险、完成必要尽调并咨询相关专业人士后审慎决策。
          </p>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-12">
          <Card className="border-gold/40 md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">重要提示</p>
            <p className="mt-4 text-base leading-8 text-muted md:text-lg md:leading-9">
              本页面内容仅用于一般风险提示，不构成投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。具体交易应结合项目资料、市场条件、合同文件和相关专业人士意见进行独立判断。
            </p>
          </Card>

          <DisclosureSection title="房地产项目风险">
            <OrderedRiskList items={realEstateRisks} />
          </DisclosureSection>

          <DisclosureSection title="跨境合作风险">
            <OrderedRiskList items={crossBorderRisks} />
          </DisclosureSection>

          <DisclosureSection title="收益假设风险">
            <p>
              任何项目测算中的 IRR、ROE、cap rate、租金、售价、退出时间和现金流预测，均属于基于特定假设的分析结果，不代表实际收益。市场条件、融资环境、建设成本、运营结果和退出价格变化，都可能导致实际结果与测算存在明显差异。
            </p>
          </DisclosureSection>

          <DisclosureSection title="SAREC 的服务边界">
            <p>
              SAREC 的工作重点是项目判断、资料梳理、风险识别、结构建议、资源协同和合作推进。SAREC 不承诺任何投资收益、融资结果、退出结果、移民结果或项目成功结果。
            </p>
          </DisclosureSection>

          <DisclosureSection title="专业人士参与">
            <p>
              涉及法律、税务、贷款、保险、证券、移民、会计和投资结构等事项时，客户应咨询相应律师、会计师、贷款机构、保险顾问、持牌专业人士或其他合规主体。SAREC
              可以根据项目需要协同相关专业资源，但不替代其专业判断。
            </p>
          </DisclosureSection>
        </div>
      </section>

      <section className="border-t border-line bg-zinc-50 py-12 md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">在推进项目之前，先把风险看清楚。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted md:text-base">
              如果你正在判断一个美国房地产项目，可以先提交资料或需求。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Button href="/zh/contact/">提交项目或合作需求</Button>
            <Button href="/zh/services/strategy/" variant="secondary">
              查看项目判断服务
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
