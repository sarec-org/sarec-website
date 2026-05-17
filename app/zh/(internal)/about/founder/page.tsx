import type { Metadata } from 'next';
import { SectionCTA } from '@/components/sections/SectionCTA';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Andy Wang｜中美房地产商会 SAREC',
  description:
    '了解 Andy Wang 的房地产、金融投资与跨境资源整合背景，以及 SAREC 中美房地产商会的成立逻辑、服务方法和项目判断理念。',
  path: '/zh/about/founder'
});

const keywordCards = [
  {
    title: '房地产全链条经验',
    description:
      '从房地产营销咨询、项目策划、销售体系搭建，到土地筛选、产品定位、项目开发和运营推进，长期参与房地产项目从判断到落地的完整过程。'
  },
  {
    title: '职业投资视角',
    description:
      '拥有经济学、企业管理和金融投资相关学习背景，长期关注房地产金融、企业融资、基金管理、资产配置和项目资本结构。'
  },
  {
    title: '跨境资源整合能力',
    description:
      '来到美国后，持续调研美国华人企业家、房地产开发商、建材商和相关行业资源，关注新移民、投资人、项目方和专业服务机构之间的协作关系。'
  }
];

const solveProblems = [
  '信息不对称',
  '对美国规则不熟悉',
  '对项目方缺乏信任',
  '不知道如何判断项目真实风险',
  '不知道如何设计合作结构',
  '不知道如何在美国本地找到可靠资源'
];

const methodology = [
  {
    title: '先判断项目，再谈机会',
    description:
      '美国房地产机会很多，但不是所有机会都值得推进。SAREC 更关注项目背后的真实逻辑：土地是否清晰，审批是否明确，融资是否可行，成本是否合理，退出是否有依据，合作结构是否保护各方利益。'
  },
  {
    title: '先看风险，再看收益',
    description:
      '对于跨境投资人而言，真正的专业不是把收益讲得更高，而是把风险讲得更清楚。SAREC 在项目判断中，会优先关注开发周期、成本超支、融资变化、市场波动、信息披露和合作方责任边界。'
  },
  {
    title: '先设计结构，再推动合作',
    description:
      '很多项目不是没有机会，而是合作结构不清晰。资金如何进入、谁来管理、收益如何分配、重大事项如何决策、项目延期如何处理、投资人如何获得信息披露，这些问题必须在合作前被认真讨论。'
  },
  {
    title: '先建立信任，再整合资源',
    description:
      '跨境合作最难的是信任。SAREC 的工作不是简单介绍双方认识，而是帮助项目方用投资人能理解的方式表达项目，也帮助投资人用更专业的框架判断项目。'
  }
];

const audiences = [
  {
    title: '在美国的华人房地产投资者',
    description:
      '包括新移民家庭、企业主、高净值客户、房地产同行、项目方和希望参与美国房地产投资或项目合作的华人投资人。'
  },
  {
    title: '在中国的华人房地产投资者',
    description:
      '包括希望了解美国房地产市场、寻找美国项目机会、参与项目合作、进行家庭资产配置或组织赴美考察的企业家和投资人。'
  }
];

const projectQuestions = [
  '这个项目为什么值得看',
  '项目的主要风险在哪里',
  '项目方是否可靠',
  '资料是否完整',
  '融资和退出逻辑是否成立',
  '合作结构是否清晰',
  '投资人如何获得信息透明',
  '项目是否具备真正落地条件'
];

const coreJudgments = [
  '中国房地产经验不能直接套用到美国项目。',
  '美国房地产判断的关键在规则、周期、结构和退出路径。',
  '跨境投资最怕判断错位，而不只是信息不够。',
  'SAREC 的价值，是帮助客户从“听项目”走向“判断项目”。'
];

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-4xl">
      <p className="font-sans text-sm font-semibold text-gold">{eyebrow}</p>
      <h2 className="mt-3 font-sans text-2xl font-bold leading-tight md:text-4xl">{title}</h2>
    </div>
  );
}

export default function FounderPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Founder / Trust</p>
          <h1 className="mt-5 font-sans text-[2.25rem] font-bold leading-tight md:text-6xl">Andy Wang</h1>
          <div className="mt-5 grid gap-1 font-sans text-lg font-semibold leading-7 text-zinc-100 md:text-2xl">
            <p>中美房地产商会会长</p>
            <p>竞合家族办公室首席架构师</p>
          </div>
          <p className="mt-6 max-w-4xl text-base leading-8 text-zinc-300 md:text-xl">
            长期深耕房地产、金融投资与跨境资源整合领域，拥有超过 28 年房地产相关从业经验。经历涵盖项目策划、土地筛选、产品定位、市场定位、销售体系搭建、开发运营、项目融资与资产配置等多个环节。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/services/" variant="gold">
              了解 SAREC 服务
            </Button>
            <Button href="/zh/contact/" variant="light">
              提交项目或合作需求
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Professional Lens" title="三个关键词理解 Andy Wang 的专业背景" />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {keywordCards.map((item) => (
              <Card key={item.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionHeader eyebrow="Background" title="从房地产项目策划，到开发与资本判断" />
          <Card>
            <div className="grid gap-5 text-sm leading-7 text-muted md:text-base">
              <p>
                Andy Wang 早期从房地产营销咨询和项目策划起步，长期服务和参与大型房地产项目。从土地价值判断、项目定位、产品设计、市场分析，到销售团队组建、广告策略、客户转化和项目去化，逐步形成了对房地产项目全链条的系统理解。
              </p>
              <p>
                此后，他进一步参与房地产开发和项目投资，从单纯销售与策划，进入项目获取、开发推进、资金组织和退出判断等更深层环节。
              </p>
              <p>
                在金融与投资方面，Andy Wang 拥有国际经济学、企业管理和金融投资相关学习背景，曾在清华大学、北京大学、上海财经大学总裁班及中欧国际工商学院 EMBA 项目学习，并长期关注房地产金融、基金管理、企业融资和资产配置。他曾在中国创办金融投资集团，参与基金、保理、贷款等金融业务，并为多家企业和房地产项目提供融资、资本结构和发展路径方面的咨询支持。
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <SectionHeader eyebrow="Why SAREC" title="为什么成立中美房地产商会？" />
            <div className="mt-6 grid gap-5 text-sm leading-7 text-muted md:text-base">
              <p>
                中国房地产行业曾经历高速发展阶段，大规模开发、产品升级、供应链成熟和市场营销能力，都曾处于非常高的水平。但随着中国房地产市场周期变化，很多房地产企业和投资人开始重新寻找海外机会。
              </p>
              <p>
                美国房地产市场相对成熟，规则更稳定，周期更长，但也完全不同于中国市场。许多中国投资人和开发商来到美国后，容易用过去熟悉的中国经验判断美国项目，忽视法律规则、城市政策、审批流程、融资结构、建设周期、成本控制、租赁市场和退出路径的差异。
              </p>
              <p>SAREC 正是在这样的背景下成立。</p>
            </div>
          </div>
          <Card className="self-start bg-white text-ink">
            <p className="font-sans text-sm font-semibold text-gold">Core Judgment</p>
            <h3 className="mt-4 font-sans text-2xl font-semibold leading-snug">按照美国的法律法规，为客户创造真实价值。</h3>
            <ul className="mt-6 grid gap-3">
              {coreJudgments.map((item) => (
                <li className="border-l-2 border-gold pl-4 text-sm leading-7 text-zinc-700 md:text-base" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionHeader eyebrow="SAREC Role" title="SAREC 关注的不是有没有项目，而是项目是否值得继续看" />
          <div>
            <p className="text-sm leading-7 text-muted md:text-base">
              很多中国投资人参与美国房地产项目，最大的障碍往往不是没有机会，而是：
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {solveProblems.map((item, index) => (
                <Card className="p-4 md:p-5" key={item}>
                  <p className="font-sans text-sm font-semibold text-gold">0{index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-muted md:text-base">{item}</p>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-sm leading-7 text-muted md:text-base">
              SAREC 希望扮演的角色，是连接中国资本、美国资本、美国项目方和专业资源网络，通过项目判断、结构设计、风险控制和落地协同，帮助跨境合作更稳健地成立并向前推进。
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Methodology" title="项目判断的方法论" />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {methodology.map((item, index) => (
              <Card key={item.title}>
                <p className="font-sans text-sm font-semibold text-gold">Method {index + 1}</p>
                <h3 className="mt-3 font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell">
          <SectionHeader eyebrow="Audience" title="SAREC 服务的核心客户" />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {audiences.map((item) => (
              <Card key={item.title}>
                <h3 className="font-sans text-xl font-semibold leading-snug">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionHeader eyebrow="Difference" title="SAREC 更关注项目判断、结构和执行" />
          <div>
            <div className="grid gap-5 text-sm leading-7 text-muted md:text-base">
              <p>普通房产交易服务更多关注物业买卖和交易完成。SAREC 更关注的是房地产项目本身的判断、结构和执行。</p>
              <p>SAREC 关注的不只是“有没有项目”，而是：</p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {projectQuestions.map((item, index) => (
                <Card className="p-4 md:p-5" key={item}>
                  <p className="font-sans text-sm font-semibold text-gold">0{index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-muted md:text-base">{item}</p>
                </Card>
              ))}
            </div>
            <p className="mt-6 text-sm leading-7 text-muted md:text-base">
              SAREC 的定位，是跨境地产项目协作与资源整合平台。它连接中国资本、美国资本与美国项目方，但核心价值不止于资源对接，而是围绕项目判断、结构设计、风险控制与落地协同，推动跨境合作更稳健地成立与推进。
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-zinc-50 py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <SectionHeader eyebrow="Network" title="专业资源网络" />
          <Card>
            <div className="grid gap-5 text-sm leading-7 text-muted md:text-base">
              <p>
                在美国，Andy Wang 长期接触并连接华人房地产开发商、建材商、贷款资源、保险顾问、地产从业者、企业家社群及相关专业服务资源。
              </p>
              <p>
                根据不同项目需求，SAREC 可以协同律师、会计师、贷款机构、保险顾问、房地产从业者、项目方和其他专业资源，为客户提供更完整的判断和执行路径。
              </p>
              <p>
                SAREC 不试图替代律师、会计师、贷款机构、保险顾问或其他持牌专业人士，而是帮助客户在复杂的跨境地产合作中，更清楚地知道什么时候需要什么资源、如何提出正确问题、如何控制关键风险。
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-8 md:py-14">
        <div className="container-shell">
          <Card className="bg-white md:p-8">
            <p className="font-sans text-sm font-semibold text-gold">Closing View</p>
            <h2 className="mt-4 max-w-4xl font-sans text-2xl font-bold leading-tight md:text-3xl">
              美国房地产项目真正的门槛，不是看到机会，而是看懂机会。
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-muted md:text-base">
              SAREC 希望帮助华人客户从“听别人介绍项目”，逐渐走向“有能力判断项目、设计结构、控制风险并参与长期合作”。这也是 SAREC 建立长期专业网络的基础。
            </p>
          </Card>
        </div>
      </section>

      <SectionCTA
        primaryCTA={{ text: '提交项目或合作需求', href: '/zh/contact/' }}
        secondaryCTA={{ text: '查看服务架构', href: '/zh/services/' }}
        subtitle="无论你是投资人、项目方、房地产同行，还是正在配置美国资产的新移民家庭，都可以提交你的需求。SAREC 会根据项目阶段、资料完整度和合作可能性，判断下一步是否适合继续沟通。"
        title="如果你正在判断一个美国房地产项目，可以先从一次清晰沟通开始。"
      />
    </article>
  );
}
