import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import styles from '@/components/membership/membership.module.css';

export const metadata: Metadata = {
  ...createPageMetadata({
    title: '付款完成｜SAREC',
    description: 'SAREC 在线入会付款完成页。',
    path: '/zh/checkout/success'
  }),
  robots: { index: false, follow: false }
};

// 骨架页：M2 不接付款，本页仅作为 Stripe 成功回跳的占位。
export default function CheckoutSuccessPage() {
  return (
    <div className={styles.page}>
      <div className={styles.centered}>
        <p className={styles.eyebrow}>CHECKOUT</p>
        <h1 className={styles.h1}>感谢您的申请</h1>
        <p className={styles.lead}>
          您的付款正在由 Stripe 处理。付款完成后，我们将核对并确认您的记录。 Payment
          confirmation will be processed. SAREC 团队会与您联系，确认资料与权益安排。
        </p>
        <p className={styles.reviewNote}>
          说明：系统尚未自动标记为已完成付款，我们会在核对后确认。如有疑问，请通过{' '}
          <Link href="/zh/contact">联系我们</Link> 与 SAREC 取得联系。
        </p>
        <div className={styles.linkRow}>
          <Link href="/zh" className={styles.btnLink}>
            返回首页
          </Link>
          <Link href="/zh/join" className={styles.btnDisabled}>
            返回入会页
          </Link>
        </div>
      </div>
    </div>
  );
}
