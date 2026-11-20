import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TradesPage } from '@/components/jobs/TradesPage';

export const metadata: Metadata = { title: '全部工种和服务｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Suspense><TradesPage /></Suspense>;
}
