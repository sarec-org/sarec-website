import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from '@/components/legal/legal.module.css';

export const metadata: Metadata = createPageMetadata({
  title: 'SAREC 入会协议｜Membership Agreement',
  description:
    'SAREC 中美房地产商会会员入会协议（草案，待律师审核）。中英双语，如有歧义以英文版本为准。',
  path: '/legal/membership-agreement'
});

// M2 骨架：占位条款草案，非最终法律文本。待律师审核后替换。
export default function MembershipAgreementPage() {
  return (
    <article className={styles.doc}>
      <p className={styles.eyebrow}>Legal / Membership</p>
      <h1 className={styles.title}>SAREC 入会协议</h1>
      <p className={styles.titleEn}>SAREC Membership Agreement</p>

      <div className={styles.notice}>
        <p>
          In case of any discrepancy, the English version shall prevail. / 如有歧义，以英文版本为准。
        </p>
        <p className={styles.pending}>Pending attorney review. / 待律师审核。</p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.h2}>1. 会员身份 · Membership</h2>
        <p className={styles.h2En}>Membership status and scope</p>
        <p>
          本协议约定申请人（“会员”）与 Sino-American Real Estate Chamber（“SAREC”）之间的会员关系。
          会员身份自 SAREC 确认申请并收到相应会费后生效，会员年度以确认页面显示的期限为准。
        </p>
        <p>
          The applicant (“Member”) and the Sino-American Real Estate Chamber (“SAREC”) enter into a
          membership relationship on the terms set out here. Membership takes effect once SAREC has
          confirmed the application and received the applicable fee, for the membership term shown at
          confirmation.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>2. 会员权益 · Benefits</h2>
        <p>
          会员权益以入会页面所列为准。部分展示、发言、推介与内容类权益须经 SAREC
          审核、排期及内容标准确认后提供。SAREC
          不承诺任何客户、成交、融资或投资收益，亦不承诺固定客户来源或业务结果。
        </p>
        <p>
          Benefits are as listed on the enrollment page. Certain visibility, speaking, referral and
          content benefits are provided subject to SAREC review, scheduling, and editorial standards.
          SAREC does not guarantee any client, transaction, financing, or investment return, nor any
          fixed source of business or outcome.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>3. 会费与推广价 · Fees and Launch Rate</h2>
        <p>
          会费金额以结账页面显示为准，一律以美元计价。2026 年度推广价为限时优惠，SAREC
          可随时调整或结束；已完成付款的会员在其会员年度内按付款时价格执行。
        </p>
        <p>
          Fees are as displayed at checkout and denominated in U.S. dollars. The 2026 Launch Rate is a
          limited-time offer that SAREC may modify or discontinue at any time; members who have
          completed payment retain the rate shown at checkout for their membership term.
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
        <h2 className={styles.h2}>5. 行为与终止 · Conduct and Termination</h2>
        <p>
          会员应遵守适用法律及 SAREC 的合理规则。SAREC
          可在会员严重违反本协议或损害商会声誉时，按最终条款规定的程序暂停或终止会员身份。
        </p>
        <p>
          Members shall comply with applicable law and SAREC’s reasonable rules. SAREC may suspend or
          terminate membership, following the process set out in the final terms, where a member
          materially breaches this agreement or harms the Chamber’s reputation.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>6. 隐私 · Privacy</h2>
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
