import type { Metadata } from 'next';
import { StaffNav } from '@/components/crm/staff/StaffNav';

export const metadata: Metadata = {
  title: 'SAREC 工作人员后台',
  robots: { index: false, follow: false }
};

/** 1.4.0：导航改成客户端组件（按登录者角色显示、当前页高亮、「更多」、手机「菜单」、搜索），清单在 components/crm/staff/nav.ts */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-deepest)', overflowX: 'clip' }}>
      <StaffNav />
      {children}
    </div>
  );
}
