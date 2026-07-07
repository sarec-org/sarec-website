import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from '@/components/legal/legal.module.css';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 战略合作伙伴协议｜Strategic Partnership Agreement',
  description:
    'SAREC 战略合作伙伴协议（网页点击确认版，版本 2026-v1）。适用于通过 SAREC 网站申请并支付战略合作伙伴费用的机构或个人。',
  path: '/legal/strategic-partnership-agreement'
});

// 正式网页点击确认版战略合作伙伴协议（版本 2026-v1）。申请人在申请表勾选同意并完成付款、经 SAREC 确认后生效。
export default function StrategicPartnershipAgreementPage() {
  return (
    <article className={styles.doc}>
      <p className={styles.eyebrow}>Legal / Strategic Partnership</p>
      <h1 className={styles.title}>SAREC 战略合作伙伴协议</h1>
      <p className={styles.titleEn}>SAREC Strategic Partnership Agreement</p>

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
          本协议约定战略合作伙伴（“合作伙伴”）与 Sino-American Real Estate Chamber（中美房地产商会，
          “SAREC”）之间的合作关系。本协议适用于通过 SAREC 网站申请并支付战略合作伙伴费用的机构或个人。
        </p>
        <p>
          This agreement sets out the relationship between the strategic partner (“Partner”) and the
          Sino-American Real Estate Chamber (“SAREC”). It applies to any organization or individual that
          applies and pays the strategic partner fee through the SAREC website.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. 生效方式</h2>
        <p className={styles.h2En}>How the agreement takes effect</p>
        <p>
          申请人在申请表中勾选同意本协议并完成付款后，且经 SAREC 确认后，本协议生效、合作关系成立。SAREC
          保留对申请进行审核并决定是否接受的权利。
        </p>
        <p>
          This agreement takes effect and the partnership is established once the applicant checks the box
          to accept this agreement in the application form, completes payment, and SAREC confirms the
          application. SAREC reserves the right to review each application and decide whether to accept
          it.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. 费用</h2>
        <p className={styles.h2En}>Fees</p>
        <p>
          费用以战略合作伙伴页面展示为准，当前为 $6,000 / 年，或 $3,000 + $3,000 半年两期（两期合计与一次性
          付清相同）。费用一律以美元计价。半年两期中第二期的具体到期日以 SAREC 确认为准。
        </p>
        <p>
          Fees are as displayed on the Strategic Partner page — currently $6,000 per year, or $3,000 +
          $3,000 in two semi-annual installments (the two installments together equal the pay-in-full
          amount). Fees are denominated in U.S. dollars. The due date of the second installment is as
          confirmed by SAREC.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. 合作期限</h2>
        <p className={styles.h2En}>Partnership term</p>
        <p>一般为 12 个月，具体以付款记录和 SAREC 确认记录为准。</p>
        <p>
          The term is generally 12 months, determined by the payment record and SAREC’s confirmation
          record.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. 合作权益</h2>
        <p className={styles.h2En}>Partnership benefits</p>
        <p>
          合作权益以战略合作伙伴页面展示为准，包括官网展示、活动露出、内容共建、访谈 / 推介申请、资源协同等。
          上述权益的具体执行需经 SAREC 审核、排期及内容标准确认。
        </p>
        <p>
          Benefits are as displayed on the Strategic Partner page, including website visibility, event
          exposure, joint content, interview or referral applications, and resource coordination. The
          delivery of these benefits is subject to SAREC review, scheduling, and editorial standards.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. 不承诺</h2>
        <p className={styles.h2En}>No guarantee</p>
        <p>
          SAREC 不承诺客户数量、成交、融资、投资收益、固定客户来源或任何商业结果。
        </p>
        <p>
          SAREC does not guarantee any number of clients, transaction, financing, investment return,
          fixed source of business, or any commercial outcome.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>7. 品牌展示</h2>
        <p className={styles.h2En}>Brand and visibility</p>
        <p>
          合作伙伴授权 SAREC 在合作期内合理展示其名称、Logo、简介及相关资料。合作伙伴需保证所提交资料真实、
          合法、可供使用。
        </p>
        <p>
          The Partner authorizes SAREC to make reasonable use of its name, logo, profile, and related
          materials during the partnership term. The Partner warrants that the materials submitted are
          true, lawful, and available for such use.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>8. 内容审核</h2>
        <p className={styles.h2En}>Content review</p>
        <p>
          所有官网展示、活动、讲座、采访、项目推介及对外发布内容，均需经 SAREC 审核。
        </p>
        <p>
          All website display, events, lectures, interviews, project referrals, and externally published
          content are subject to SAREC review.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>9. 付款与退款</h2>
        <p className={styles.h2En}>Payment and refunds</p>
        <p>
          费用支付后，原则上不因合作伙伴单方原因退款。如因重复支付、系统错误，或 SAREC 无法提供基础合作资格，
          可由 SAREC 审核处理。
        </p>
        <p>
          Once paid, fees are generally non-refundable for reasons attributable solely to the Partner.
          Where there is duplicate payment, system error, or where SAREC is unable to provide the basic
          eligibility for the partnership, SAREC may review and handle the matter.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>10. 终止</h2>
        <p className={styles.h2En}>Termination</p>
        <p>
          如合作伙伴提供虚假信息、违法违规、损害 SAREC 声誉或进行误导性宣传，SAREC 可暂停或终止其合作权益。
        </p>
        <p>
          SAREC may suspend or terminate a Partner’s benefits where the Partner provides false
          information, violates laws or regulations, harms SAREC’s reputation, or engages in misleading
          promotion.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>11. 法律关系</h2>
        <p className={styles.h2En}>Legal relationship</p>
        <p>
          本协议不构成合伙、代理、雇佣、投资顾问、融资中介或收益承诺关系。
        </p>
        <p>
          This agreement does not create any partnership, agency, employment, investment-advisory,
          financing-intermediary, or return-guarantee relationship.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>12. 隐私</h2>
        <p className={styles.h2En}>Privacy</p>
        <p>
          合作伙伴信息的收集与使用适用 SAREC <Link href="/legal/privacy">隐私政策</Link>。
        </p>
        <p>
          The collection and use of Partner information is governed by the SAREC{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <div className={styles.linkRow}>
        <Link href="/legal/privacy">隐私政策 / Privacy Policy</Link>
        <Link href="/zh/strategic-partners">返回合作伙伴页 / Back to Strategic Partners</Link>
      </div>
    </article>
  );
}
