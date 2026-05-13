import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '免责声明｜SAREC 中美房地产商会',
  description: 'SAREC 网站内容仅供一般信息参考，不构成投资建议、证券发行、法律意见、税务意见、移民建议或收益承诺。',
  path: '/zh/legal/disclaimer'
});

const sections = [
  {
    title: '一般信息说明',
    body:
      'SAREC 网站上的文章、案例、项目介绍、研究观点、服务说明和市场观察，均基于公开信息、项目资料、行业经验或一般性分析，不针对任何个人或机构的具体情况构成建议。'
  },
  {
    title: '非投资建议',
    body:
      '网站内容不构成购买、出售、投资、认购、参与任何房地产项目、基金、证券、贷款、保险产品、移民项目或其他金融产品的建议、邀约或承诺。任何投资或合作决定，应由客户基于自身情况、项目资料、独立尽调和专业意见作出。'
  },
  {
    title: '非法律、税务、移民、证券意见',
    body:
      'SAREC 不是律师事务所、会计师事务所、税务机构、证券投资顾问或移民律师机构。涉及法律、税务、证券、贷款、保险、移民和跨境交易的问题，应咨询相应持牌或合规专业人士。'
  },
  {
    title: '项目和案例说明',
    body:
      '网站中展示的项目、案例或脱敏案例，主要用于说明项目判断逻辑、风险识别方法、合作结构和服务方式。相关内容不代表任何项目一定适合投资，也不代表未来结果会与案例描述一致。'
  },
  {
    title: '第三方信息',
    body:
      '网站可能引用、链接或提及第三方信息、专业资源或合作方。SAREC 不对第三方网站、第三方服务或第三方观点承担控制责任。客户应自行判断相关信息的适用性和可靠性。'
  },
  {
    title: '信息准确性',
    body:
      'SAREC 努力保持网站信息准确、及时和完整，但不保证所有内容在任何时间均完全准确、完整或最新。房地产市场、法律政策、融资条件和项目情况可能随时间变化。'
  },
  {
    title: '服务边界',
    body:
      'SAREC 的价值在于项目判断、结构建议、资源协同和合作推进。具体交易文件、投资决策、资金安排、税务处理、法律责任和专业意见，应由客户及其专业顾问团队独立确认。'
  }
];

export default function DisclaimerPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Legal / Disclaimer</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">免责声明</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-xl">
            本网站内容用于介绍 SAREC 的服务、观点、项目判断框架、研究内容和合作方式。所有内容仅供一般信息参考，不应被理解为投资建议、证券发行、法律意见、税务意见、移民建议或任何收益承诺。
          </p>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-12">
          {sections.map((section) => (
            <section className="border-t border-line pt-10 md:pt-12" key={section.title}>
              <h2 className="font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">{section.title}</h2>
              <p className="mt-6 text-base leading-8 text-muted md:text-lg md:leading-9">{section.body}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-zinc-50 py-12 md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">
            如果你正在判断一个项目，建议先了解服务边界和风险，再进入具体沟通。
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/legal/risk-disclosure/">查看风险披露</Button>
            <Button href="/zh/contact/" variant="secondary">
              提交项目或需求
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
