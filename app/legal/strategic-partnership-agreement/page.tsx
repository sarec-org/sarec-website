import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from '@/components/legal/legal.module.css';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 战略合作伙伴协议｜Strategic Partnership Agreement',
  description:
    'SAREC 战略合作伙伴协议（草案，待律师审核）。中英双语，如有歧义以英文版本为准。',
  path: '/legal/strategic-partnership-agreement'
});

// M2 骨架：占位条款草案，非最终法律文本。待律师审核后替换。
export default function StrategicPartnershipAgreementPage() {
  return (
    <article className={styles.doc}>
      <p className={styles.eyebrow}>Legal / Strategic Partnership</p>
      <h1 className={styles.title}>SAREC 战略合作伙伴协议</h1>
      <p className={styles.titleEn}>SAREC Strategic Partnership Agreement</p>

      <div className={styles.notice}>
        <p>
          In case of any discrepancy, the English version shall prevail. / 如有歧义，以英文版本为准。
        </p>
        <p className={styles.pending}>Pending attorney review. / 待律师审核。</p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.h2}>1. 合作关系 · Partnership</h2>
        <p>
          本协议约定战略合作伙伴（“合作伙伴”）与 Sino-American Real Estate Chamber（“SAREC”）
          之间的合作关系。合作关系自 SAREC 确认申请并收到相应费用后生效。合作伙伴为独立机构，
          本协议不构成合伙、代理、雇佣或类似关系。
        </p>
        <p>
          This agreement sets out the relationship between the strategic partner (“Partner”) and the
          Sino-American Real Estate Chamber (“SAREC”). It takes effect once SAREC has confirmed the
          application and received the applicable fee. The Partner is an independent organization; this
          agreement does not create any partnership, agency, employment, or similar relationship between
          the parties.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. 合作权益 · Benefits</h2>
        <p>
          合作权益以战略合作伙伴页面所列为准，包括深度资源协同、联合内容与活动、官网优先展示及项目 /
          主题推介机会。上述权益须经 SAREC 审核、排期及内容标准确认后提供。SAREC
          不承诺任何客户、成交、融资或投资收益，亦不承诺固定客户来源或业务结果。
        </p>
        <p>
          Benefits are as listed on the Strategic Partner page, including deeper resource coordination,
          joint content and events, priority website visibility, and project or topic referral
          opportunities. These benefits are provided subject to SAREC review, scheduling, and editorial
          standards. SAREC does not guarantee any client, transaction, financing, or investment return,
          nor any fixed source of business or outcome.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. 费用与付款方式 · Fees and Payment</h2>
        <p>
          年度合作费用以战略合作伙伴页面显示为准，一律以美元计价。合作伙伴可选择一次性付清，或分为半年
          两期支付；两期合计与一次性付清相同。第二期的具体到期日以 SAREC 确认为准。
        </p>
        <p>
          The annual partnership fee is as displayed on the Strategic Partner page and denominated in
          U.S. dollars. The Partner may pay in full or in two semi-annual installments; the two
          installments together equal the pay-in-full amount. The due date of the second installment is
          as confirmed by SAREC.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>4. 退款 · Refunds</h2>
        <p>
          退款政策将在付款功能上线时以最终条款为准。本草案不构成对退款、续费或终止的最终约定。
        </p>
        <p>
          The refund policy will be set out in the final terms when payment is enabled. This draft does
          not constitute the final terms on refunds, renewal, or termination.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>5. 品牌与展示 · Brand and Visibility</h2>
        <p>
          合作伙伴授权 SAREC 在合作期内于官网及相关活动中展示其名称与标识用于合作说明。任一方使用另一方
          品牌均应符合对方合理的品牌规范，且不得作虚假或误导性陈述。
        </p>
        <p>
          The Partner authorizes SAREC to display its name and logo on the website and at related events
          for the purpose of describing the partnership during its term. Each party’s use of the other’s
          brand shall follow the other’s reasonable brand guidelines and shall not be false or
          misleading.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. 隐私 · Privacy</h2>
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
