import type { Metadata } from 'next';
import { Checkin } from '@/components/crm/Checkin';

export const metadata: Metadata = { title: '活动签到｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params, searchParams }: { params: { slug: string }; searchParams: { k?: string } }) {
  return <Checkin slug={params.slug} k={searchParams.k ?? ''} />;
}
