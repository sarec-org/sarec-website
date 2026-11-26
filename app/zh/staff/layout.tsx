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
      {/* 指令 89-B 验收 P3-2：全站 html/body 是 overflow-x: hidden，这会让后台顶栏的 position: sticky 失效（页面滚下去搜索框跟着跑掉）。
          只在后台把它换成 clip（同样不横滑，但不产生滚动容器）；不支持 clip 的老浏览器保持原样 */}
      <style>{'@supports (overflow-x: clip) { html, body { overflow-x: clip; } }'}</style>
      <StaffNav />
      {children}
    </div>
  );
}
