import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '@/components/crm/crm.module.css';

export const metadata: Metadata = {
  title: 'SAREC 工作人员后台',
  robots: { index: false, follow: false }
};

const NAV = [
  ['/zh/staff', '首页'],
  ['/zh/staff/followups', '待跟进'],
  ['/zh/staff/checkin', '签到台'],
  ['/zh/staff/payments', '核款'],
  ['/zh/staff/events', '活动'],
  ['/zh/staff/contacts', '客户'],
  ['/zh/staff/album', '相册'],
  ['/zh/staff/rooms', '会议室/电子屏'],
  ['/zh/staff/growth', '增长与设置'],
  ['/zh/staff/display', '官网展示'],
  ['/zh/staff/agent', 'AI 助手'],
  ['/zh/staff/settings', '设置']
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-deepest)' }}>
      <header style={{ borderBottom: '1px solid var(--line-3)', padding: '0.6rem 1rem', position: 'sticky', top: 0, zIndex: 30, background: 'var(--ink-deepest)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <Link href="/zh/staff" style={{ color: 'var(--gold)', textDecoration: 'none', fontFamily: 'var(--serif-zh)', fontSize: '1.05rem' }}>
            SAREC 工作人员后台
          </Link>
          <Link href="/" className={styles.small} style={{ textDecoration: 'none' }}>
            返回官网
          </Link>
        </div>
        <nav className={styles.tabs} style={{ maxWidth: 1080, margin: '0.5rem auto 0' }}>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={styles.tab}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
