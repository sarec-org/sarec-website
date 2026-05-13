import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: '隐私政策｜SAREC 中美房地产商会',
  description: '了解 SAREC 如何收集、使用和保护通过网站表单、咨询、会员申请、项目提交和活动报名获得的信息。',
  path: '/zh/legal/privacy'
});

const collectedInfo = [
  '姓名、邮箱、电话、微信或其他联系方式。',
  '客户身份类型，例如投资人、项目方、房地产同行、新移民家庭、企业主或其他。',
  '项目资料、合作需求、投资偏好、城市偏好、资金规模区间或项目规模区间。',
  '会员申请、考察报名、活动报名或咨询留言。',
  '网站访问、页面浏览、表单提交等基础技术信息。'
];

const useCases = [
  '回复客户咨询和合作需求。',
  '初步判断项目阶段、资料完整度和合作可能性。',
  '安排项目初筛、尽调沟通、合作结构讨论、会员服务或活动报名。',
  '改进网站内容、服务产品和客户沟通流程。',
  '在客户允许或业务必要情况下，与律师、会计师、贷款机构、保险顾问、项目方或其他专业资源协同沟通。'
];

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-10 md:pt-12">
      <h2 className="font-sans text-2xl font-bold leading-tight text-ink md:text-3xl">{title}</h2>
      <div className="mt-6 text-base leading-8 text-muted md:text-lg md:leading-9">{children}</div>
    </section>
  );
}

function OrderedPolicyList({ items }: { items: string[] }) {
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

export default function PrivacyPage() {
  return (
    <article>
      <section className="bg-deep py-16 text-white md:py-24">
        <div className="container-shell max-w-5xl">
          <p className="font-sans text-sm font-semibold text-gold">Legal / Privacy</p>
          <h1 className="mt-5 font-sans text-[2rem] font-bold leading-tight md:text-6xl">隐私政策</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 md:text-xl">
            SAREC
            重视客户、会员、投资人、项目方和合作伙伴的信息保护。本隐私政策说明我们可能收集哪些信息、如何使用这些信息，以及在什么情况下可能与相关专业人士或合作方共享必要信息。
          </p>
        </div>
      </section>

      <section className="py-12 md:py-24">
        <div className="container-shell grid gap-12">
          <PolicySection title="我们可能收集的信息">
            <OrderedPolicyList items={collectedInfo} />
          </PolicySection>

          <PolicySection title="我们如何使用信息">
            <OrderedPolicyList items={useCases} />
          </PolicySection>

          <PolicySection title="信息共享原则">
            <p>
              SAREC
              不会以出售个人信息为目的向第三方转让客户信息。只有在客户沟通、项目判断、专业服务协同、法律合规要求或客户授权的情况下，才可能与必要的专业人士或合作方共享相关信息。
            </p>
          </PolicySection>

          <PolicySection title="信息保护">
            <p>
              SAREC
              会采取合理措施保护客户提交的信息，避免未经授权的访问、披露、修改或滥用。但互联网传输和电子存储无法保证绝对安全，客户在提交敏感项目资料或个人信息前应自行判断必要性。
            </p>
          </PolicySection>

          <PolicySection title="客户选择">
            <p>
              客户可以要求我们更新、删除或停止使用其提供的信息。相关请求可通过网站公开联系方式提交。对于因法律、合规、交易记录或业务审计需要保留的信息，SAREC
              可能在合理期限内继续保存。
            </p>
          </PolicySection>

          <PolicySection title="第三方服务">
            <p>
              网站可能使用第三方托管、表单、分析、邮件、云服务或其他工具。这些服务可能根据其自身隐私政策处理必要信息。SAREC 会尽量选择可靠服务商，并避免不必要的数据收集。
            </p>
          </PolicySection>

          <PolicySection title="政策更新">
            <p>SAREC 可能根据业务发展、法律要求或网站功能变化更新本隐私政策。更新后的内容将在网站发布后生效。</p>
          </PolicySection>
        </div>
      </section>

      <section className="border-t border-line bg-zinc-50 py-12 md:py-20">
        <div className="container-shell grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <h2 className="max-w-3xl font-sans text-2xl font-bold leading-tight md:text-4xl">如需了解我们如何处理你的项目或会员信息，可以先与我们联系。</h2>
          <Button href="/zh/contact/">联系我们</Button>
        </div>
      </section>
    </article>
  );
}
