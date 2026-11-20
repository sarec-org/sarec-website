import { InternalNav } from '@/components/layout/InternalNav';
import { SiteFooter } from '@/components/layout/SiteFooter';

/** 找工人 · 接活（网站）：和其它内页一样的顶部导航、页脚 */
export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InternalNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
