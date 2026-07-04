import { InternalNav } from '@/components/layout/InternalNav';
import { SiteFooter } from '@/components/layout/SiteFooter';

// /legal/* 为站点级法律文档（非 /zh 内页组），复用统一导航与页脚。
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InternalNav />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
