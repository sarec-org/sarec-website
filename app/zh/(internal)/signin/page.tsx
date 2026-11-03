import type { Metadata } from 'next';
import { LoginPage } from '@/components/crm/LoginPage';

export const metadata: Metadata = { title: '登录｜SAREC', robots: { index: false } };

export default function Page({ searchParams }: { searchParams: { next?: string; email?: string } }) {
  const next = searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '/zh/me';
  return <LoginPage next={next} email={searchParams.email ?? ''} />;
}
