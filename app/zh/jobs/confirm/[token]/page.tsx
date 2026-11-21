import type { Metadata } from 'next';
import { ProxyConfirm } from '@/components/jobs/ProxyConfirm';

export const metadata: Metadata = { title: '确认接活儿资料｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { token: string } }) {
  return <ProxyConfirm token={params.token} />;
}
