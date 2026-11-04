import type { Metadata } from 'next';
import { ConfirmEmail } from '@/components/crm/ConfirmEmail';

export const metadata: Metadata = { title: '确认邮箱｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ searchParams }: { searchParams: { t?: string } }) {
  return <ConfirmEmail token={searchParams.t ?? ''} />;
}
