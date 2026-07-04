import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from '@/components/membership/membership.module.css';

export const metadata: Metadata = {
  ...createPageMetadata({
    title: '付款未完成｜SAREC',
    description: 'SAREC 在线入会付款取消页。',
    path: '/zh/checkout/cancel'
  }),
  robots: { index: false, follow: false }
};

// 骨架页：M2 不接付款，本页仅作为 Stripe 取消回跳的占位。
export default function CheckoutCancelPage() {
  return (
    <div className={styles.page}>
      <div className={styles.centered}>
        <p className={styles.eyebrow}>CHECKOUT</p>
        <h1 className={styles.h1}>付款未完成</h1>
        <p className={styles.lead}>
          您本次未完成付款，未产生任何费用。您可以稍后回到申请页重新提交，或与 SAREC 团队联系。
        </p>
        <p className={styles.reviewNote}>
          如需协助，请通过 <Link href="/zh/contact">联系我们</Link>。
        </p>
        <div className={styles.linkRow}>
          <Link href="/zh/join" className={styles.btnLink}>
            返回入会页
          </Link>
          <Link href="/zh" className={styles.btnDisabled}>
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
