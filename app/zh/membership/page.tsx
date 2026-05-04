import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '会员服务｜SAREC 中美房地产商会',
  description:
    'SAREC 会员服务面向中美房地产投资人、项目方、房地产从业者、新移民家庭和跨境企业主，提供项目交流、资源协同、专业内容、考察培训和长期合作网络。',
  path: '/zh/membership'
});

const memberProfiles = [
  {
    title: '华人房地产投资人',
    body: '希望理解美国房地产项目、风险结构、投资路径和合作方式的投资人。'
  },
  {
    title: '美国项目方与开发商',
    body: '有项目、有资源或有执行能力，希望接触跨境资本、合作伙伴和专业表达支持。'
  },
  {
    title: '房地产从业者',
    body: '包括经纪人、开发商、建材商、贷款、保险、设计、施工、物业管理等相关行业人士。'
  },
  {
    title: '新移民家庭与企业主',
    body: '希望在美国建立更稳健的资产配置框架，理解房地产、保险、现金流和家庭保障之间关系。'
  },
  {
    title: '中国企业家和投资人',
    body: '希望系统了解美国房地产市场、项目规则、风险控制和跨境资产配置路径。'
  },
  {
    title: '专业服务人士',
    body: '包括律师、会计师、贷款机构、保险顾问、移民服务、税务顾问等，希望服务中美跨境地产客户。'
  }
];

const memberValues = [
  {
    title: '专业内容',
    body: '定期获取美国房地产项目判断、市场观察、风险分析、LP/GP结构、EB-5、资产配置等主题内容。'
  },
  {
    title: '项目交流',
    body: '围绕真实项目和脱敏案例，理解项目机会、风险点、结构设计和推进路径。'
  },
  {
    title: '资源协同',
    body: '根据需求连接房地产开发商、投资人、贷款、保险、法律、会计、建材、设计、施工等资源。'
  },
  {
    title: '考察与活动',
    body: '参与美国房地产项目考察、主题培训、闭门交流、企业家午餐会和跨境商务活动。'
  },
  {
    title: '会员沟通',
    body: '通过线上或线下方式与 SAREC 保持持续沟通，获得更长期的项目、市场和资源更新。'
  },
  {
    title: '合作机会',
    body: '在合适情况下，会员可进一步了解项目初筛、深度尽调、结构设计、项目合作或资产配置服务。'
  }
];

const serviceTiers = [
  {
    title: '内容会员',
    fit: '希望持续学习美国房地产、跨境投资、项目判断和资产配置的人。',
    service: '定期内容、线上分享、研究文章、市场观察。'
  },
  {
    title: '活动会员',
    fit: '希望参与线下交流、项目考察、主题培训和企业家活动的人。',
    service: '活动优先通知、考察报名、闭门交流、专题课程。'
  },
  {
    title: '资源会员',
    fit: '希望与房地产项目、资金、专业服务和合作伙伴建立连接的人。',
    service: '需求梳理、资源介绍、专业人士协同、合作路径讨论。'
  },
  {
    title: '项目合作会员',
    fit: '有明确项目、资金、资源或合作需求，希望进入更深度项目判断与合作推进的人。',
    service: '项目初筛、尽调沟通、结构设计、项目表达优化、资本协同。'
  }
];

const standards = [
  '是否有真实身份和清晰需求',
  '是否愿意接受必要的风险披露',
  '是否理解跨境地产合作需要时间和专业判断',
  '是否愿意尊重美国法律法规、合同规则和专业服务边界',
  '是否具备长期合作和资源互补可能',
  '是否重视信誉、透明和持续沟通'
];

const applicationSteps = [
  {
    title: '提交基本信息',
    body: '通过网站提交身份、联系方式和会员需求。'
  },
  {
    title: '初步沟通',
    body: 'SAREC 了解你的背景、需求、资源和关注方向。'
  },
  {
    title: '判断适合的会员类型',
    body: '根据你的需求，判断更适合内容、活动、资源还是项目合作方向。'
  },
  {
    title: '进入会员沟通',
    body: '确认后进入相应会员服务、活动通知、项目交流或合作路径。'
  }
];

const relatedLinks = [
  {
    title: '合作方案与服务产品',
    body: '了解 SAREC 如何与投资人、项目方和高净值家庭合作。',
    href: '/zh/solutions/'
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
    body: '在参与项目前，先了解房地产投资和跨境合作中的主要风险。',
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

export default function MembershipPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">SAREC Membership</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">加入一个真正理解中美房地产合作的专业网络</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-xl">
            SAREC
            会员服务面向中美房地产投资人、项目方、房地产从业者、新移民家庭和跨境企业主。我们希望通过专业内容、项目交流、资源协同、考察培训和长期关系沉淀，帮助会员更清楚地理解美国房地产机会、风险和合作路径。
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/zh/contact#inquiry-form" variant="gold">
              申请成为会员
            </Button>
            <Button href="/zh/solutions/" variant="light">
              查看合作方案
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Why Membership</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">跨境地产合作最难的，不只是找到项目</h2>
          </div>
          <Card className="md:p-10">
            <p className="text-base leading-8 text-muted md:text-lg md:leading-9">
              很多中国投资人和美国华人投资人并不缺项目信息，真正缺的是可信的判断框架、长期稳定的专业网络，以及能够持续交流和互相验证的资源环境。SAREC
              会员网络希望连接投资人、项目方、房地产从业者、专业服务资源和新移民家庭，让跨境地产合作不再只依赖一次介绍，而是建立在长期理解、信任和专业判断基础上。
            </p>
          </Card>
        </div>
      </section>

      <SectionShell eyebrow="Who Should Join" title="谁适合加入 SAREC？" muted>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memberProfiles.map((item) => (
            <Card className="bg-white" key={item.title}>
              <h3 className="font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Member Value" title="会员价值不只是认识人，而是进入一个长期协作网络">
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memberValues.map((item, index) => (
            <Card key={item.title}>
              <NumberBadge value={index + 1} />
              <h3 className="mt-5 font-sans text-xl font-semibold leading-snug text-ink">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted md:text-base">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Service Scope" title="SAREC 会员服务内容" muted>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {serviceTiers.map((tier) => (
            <Card className="bg-white md:p-9" key={tier.title}>
              <h3 className="font-sans text-xl font-semibold leading-snug text-ink">{tier.title}</h3>
              <div className="mt-5 grid gap-4 text-sm leading-7 text-muted md:text-base">
                <p>
                  <span className="font-sans font-semibold text-ink">适合：</span>
                  {tier.fit}
                </p>
                <p>
                  <span className="font-sans font-semibold text-ink">服务：</span>
                  {tier.service}
                </p>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-8 rounded-md border border-line bg-white p-5 text-sm leading-7 text-muted md:p-6 md:text-base">
          具体会员服务、活动、考察、咨询或项目合作费用，将根据服务内容、参与深度和合作方式另行沟通。
        </p>
      </SectionShell>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-sans text-sm font-semibold text-gold">Member Standards</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">会员不是简单加入一个名单</h2>
            <p className="mt-5 text-sm leading-7 text-muted md:text-base">
              SAREC 更重视会员的真实性、专业性、长期合作意愿和风险意识。我们希望会员网络建立在互信、透明、专业和长期价值基础上，而不是短期项目信息交换。
            </p>
          </div>
          <ol className="grid gap-4">
            {standards.map((item, index) => (
              <li className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-[2.5rem_1fr] md:p-5" key={item}>
                <NumberBadge value={index + 1} />
                <p className="text-sm leading-7 text-muted md:text-base">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SectionShell eyebrow="Application Process" title="如何申请成为会员" muted>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {applicationSteps.map((step, index) => (
            <Card className="bg-white" key={step.title}>
              <NumberBadge value={index + 1} />
              <h3 className="mt-5 font-sans text-lg font-semibold leading-snug text-ink">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted">{step.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <section className="py-12 md:py-24">
        <div className="container-shell">
          <Card className="border-gold/40 md:p-10">
            <p className="font-sans text-sm font-semibold text-gold">重要说明</p>
            <h2 className="mt-3 font-sans text-2xl font-bold leading-tight text-ink md:text-4xl">会员服务边界</h2>
            <p className="mt-6 text-base leading-8 text-muted md:text-lg md:leading-9">
              SAREC
              会员服务不构成任何投资收益承诺、证券发行、法律意见、税务意见、移民建议或项目成功保证。涉及房地产投资、项目开发、融资、保险、税务、法律、移民和证券等事项，应结合相关持牌或专业人士意见审慎决策。
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
            <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如果你希望进入一个更长期的中美房地产合作网络，可以先从会员申请开始。</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
              无论你是投资人、项目方、房地产同行、专业服务人士，还是正在配置美国资产的新移民家庭，都可以先提交你的基本信息。SAREC
              会根据你的背景和需求，判断适合的会员服务和下一步沟通方式。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <Button href="/zh/contact#inquiry-form" variant="light">
              申请成为会员
            </Button>
            <Button href="/zh/solutions/" variant="gold">
              查看合作方案
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
}
