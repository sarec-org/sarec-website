import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from '@/components/legal/legal.module.css';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 会员入会协议｜Membership Agreement',
  description:
    'SAREC 中美房地产商会会员入会协议（网页点击确认版，版本 2026-v1）。适用于通过 SAREC 网站申请会员并付款的个人、公司或机构。',
  path: '/legal/membership-agreement'
});

// 正式网页点击确认版会员入会协议（版本 2026-v1）。申请人在入会表单勾选同意并完成付款、经 SAREC 确认后生效。
export default function MembershipAgreementPage() {
  return (
    <article className={styles.doc}>
      <p className={styles.eyebrow}>Legal / Membership</p>
      <h1 className={styles.title}>SAREC 会员入会协议</h1>
      <p className={styles.titleEn}>SAREC Membership Agreement</p>

      <div className={styles.notice}>
        <p>版本 Version 2026-v1</p>
        <p>
          本协议为网页点击确认版协议。中英文如有不一致，以本中文页面展示为准，英文仅供参考。 / This is a
          click-to-accept agreement. In case of any inconsistency, the Chinese version shown on this page
          prevails; the English text is for reference only.
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.h2}>1. 协议范围与适用对象</h2>
        <p className={styles.h2En}>Scope and applicability</p>
        <p>
          本协议约定申请人（“会员”）与 Sino-American Real Estate Chamber（中美房地产商会，“SAREC”）
          之间的会员关系。本协议适用于通过 SAREC 网站申请会员并付款的个人、公司或机构。
        </p>
        <p>
          This agreement sets out the membership relationship between the applicant (“Member”) and the
          Sino-American Real Estate Chamber (“SAREC”). It applies to any individual, company, or
          organization that applies for membership and pays through the SAREC website.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. 生效方式</h2>
        <p className={styles.h2En}>How the agreement takes effect</p>
        <p>
          申请人在入会申请表中勾选同意本协议并完成付款后，且经 SAREC 确认后，本协议生效、会员身份成立。
          SAREC 保留对申请进行审核并决定是否接受的权利。
        </p>
        <p>
          This agreement takes effect and membership is established once the applicant checks the box to
          accept this agreement in the enrollment form, completes payment, and SAREC confirms the
          application. SAREC reserves the right to review each application and decide whether to accept
          it.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. 会员档位与费用</h2>
        <p className={styles.h2En}>Membership tiers and fees</p>
        <p>
          会员档位与费用以在线入会页面所选择及展示为准，包括会员、理事单位、常务理事单位、副会长单位等档位。
          费用一律以美元计价，以结账页面显示金额为准。
        </p>
        <p>
          Membership tiers and fees are as selected and displayed on the online enrollment page,
          including the Member, Director Unit, Executive Director Unit, and Vice-President Unit tiers.
          Fees are denominated in U.S. dollars and are as shown at checkout.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. 会员期限</h2>
        <p className={styles.h2En}>Membership term</p>
        <p>一般为 12 个月，具体以付款记录和 SAREC 确认记录为准。</p>
        <p>
          The term is generally 12 months, determined by the payment record and SAREC’s confirmation
          record.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. 会员权益</h2>
        <p className={styles.h2En}>Member benefits</p>
        <p>
          会员权益以会员页面展示为准。活动、展示、演讲、采访、项目推介、牌匾、官网展示等权益，均需经 SAREC
          审核、排期及内容标准确认后提供。
        </p>
        <p>
          Benefits are as displayed on the membership page. Benefits such as events, visibility,
          speaking, interviews, project referrals, plaques, and website display are provided subject to
          SAREC review, scheduling, and editorial standards.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. 不承诺</h2>
        <p className={styles.h2En}>No guarantee</p>
        <p>
          SAREC 不承诺任何客户、成交、融资、投资收益、固定客户来源或任何商业结果。
        </p>
        <p>
          SAREC does not guarantee any client, transaction, financing, investment return, fixed source of
          business, or any commercial outcome.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>7. 会员义务</h2>
        <p className={styles.h2En}>Member obligations</p>
        <p>
          会员应提交真实信息、遵守法律法规，不得冒用 SAREC 名义，不得进行误导性宣传。
        </p>
        <p>
          Members shall submit truthful information, comply with applicable laws and regulations, refrain
          from using SAREC’s name without authorization, and refrain from misleading promotion.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>8. 资料授权</h2>
        <p className={styles.h2En}>Use of materials</p>
        <p>
          会员授权 SAREC 在会员期内为履行会员权益而合理使用其名称、Logo、简介、项目资料等。会员保证所提交
          资料真实、合法、可供使用。
        </p>
        <p>
          The Member authorizes SAREC to make reasonable use of its name, logo, profile, and project
          materials during the membership term for the purpose of delivering member benefits. The Member
          warrants that the materials submitted are true, lawful, and available for such use.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>9. 付款与退款</h2>
        <p className={styles.h2En}>Payment and refunds</p>
        <p>
          费用支付后，原则上不因会员单方原因退款。如因重复支付、系统错误等情形，可由 SAREC 审核处理。
        </p>
        <p>
          Once paid, fees are generally non-refundable for reasons attributable solely to the Member. In
          cases such as duplicate payment or system error, SAREC may review and handle the matter.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>10. 暂停或终止</h2>
        <p className={styles.h2En}>Suspension or termination</p>
        <p>
          如会员提供虚假信息、违法违规、损害 SAREC 声誉或违反本协议及 SAREC 规则，SAREC 可暂停或终止其
          会员权益。
        </p>
        <p>
          SAREC may suspend or terminate a Member’s benefits where the Member provides false information,
          violates laws or regulations, harms SAREC’s reputation, or breaches this agreement or SAREC’s
          rules.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>11. 法律关系</h2>
        <p className={styles.h2En}>Legal relationship</p>
        <p>
          会员身份不构成合伙、代理、雇佣、投资顾问、融资中介或收益承诺关系。
        </p>
        <p>
          Membership does not create any partnership, agency, employment, investment-advisory,
          financing-intermediary, or return-guarantee relationship.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>12. 隐私</h2>
        <p className={styles.h2En}>Privacy</p>
        <p>
          会员信息的收集与使用适用 SAREC <Link href="/legal/privacy">隐私政策</Link>。
        </p>
        <p>
          The collection and use of member information is governed by the SAREC{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <div className={styles.linkRow}>
        <Link href="/legal/privacy">隐私政策 / Privacy Policy</Link>
        <Link href="/zh/join">返回入会页 / Back to Join</Link>
      </div>
    </article>
  );
}
