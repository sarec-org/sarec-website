import type { Metadata } from 'next';
import { PayOrder } from '@/components/crm/PayOrder';

export const metadata: Metadata = { title: '付款｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params, searchParams }: { params: { no: string }; searchParams: { stripe?: string; t?: string } }) {
  return <PayOrder orderNo={params.no} stripe={searchParams.stripe ?? null} token={searchParams.t ?? null} />;
}
