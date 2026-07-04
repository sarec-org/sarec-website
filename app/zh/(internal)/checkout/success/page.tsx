import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '@/lib/seo';
import { getCheckoutStatusBySession } from '@/lib/membership/status';
import styles from '@/components/membership/membership.module.css';

export const metadata: Metadata = {
  ...createPageMetadata({
    title: '付款完成｜SAREC',
    description: 'SAREC 在线入会付款完成页。',
    path: '/zh/checkout/success'
  }),
  robots: { index: false, follow: false }
};

// 读取实时状态，必须动态渲染（依 session_id 查 DB）。
export const dynamic = 'force-dynamic';

// 只信任 DB 中 webhook 回写的 paid，绝不凭 URL session_id 判定已付。
export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams?: { session_id?: string };
}) {
  const sessionId = typeof searchParams?.session_id === 'string' ? searchParams.session_id : '';
  const status = await getCheckoutStatusBySession(sessionId);

  const confirmed = status.paid;
  const partial = status.paid && status.partiallyPaid;

  return (
    <div className={styles.page}>
      <div className={styles.centered}>
        <p className={styles.eyebrow}>CHECKOUT</p>

        {confirmed ? (
          <>
            <h1 className={styles.h1}>付款已确认</h1>
            {partial ? (
              <p className={styles.lead}>
                您的战略合作伙伴 <strong>第一期</strong> 付款已确认（Payment confirmed）。
                第二期将在约定日期另行确认，本次不会自动扣款。SAREC 团队会与您联系，确认资料与权益安排。
              </p>
            ) : (
              <p className={styles.lead}>
                您的付款已确认（Payment confirmed）。
                {status.membershipEndDate ? ` 当前会员年度有效期至 ${status.membershipEndDate}。` : ''}{' '}
                SAREC 团队会与您联系，确认资料与权益安排。
              </p>
            )}
            <p className={styles.reviewNote}>
              如有疑问，请通过 <Link href="/zh/contact">联系我们</Link> 与 SAREC 取得联系。
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.h1}>感谢您的申请</h1>
            <p className={styles.lead}>
              您的付款正在处理中，稍后确认。 Payment is being processed. 页面确认可能有短暂延迟，
              到账确认后我们会与您联系。
            </p>
            <p className={styles.reviewNote}>
              说明：系统尚未收到最终付款确认，请稍后刷新；如长时间未确认或有疑问，请通过{' '}
              <Link href="/zh/contact">联系我们</Link> 与 SAREC 取得联系。
            </p>
          </>
        )}

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
