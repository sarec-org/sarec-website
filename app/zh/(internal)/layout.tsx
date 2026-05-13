import { InternalNav } from '@/components/layout/InternalNav';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function ZhInternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InternalNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
