import { InternalNav } from '@/components/layout/InternalNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MobileTabBar } from '@/components/home/HomeDesk';

export default function ZhInternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InternalNav />
      <main>{children}</main>
      <SiteFooter />
      {/* 1.2 手机版底部三栏（首页 / 活动 / 我的），只在这三个栏目页显示 */}
      <MobileTabBar />
    </>
  );
}
