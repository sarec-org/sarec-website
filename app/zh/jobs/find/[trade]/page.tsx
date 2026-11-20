import type { Metadata } from 'next';
import { ProsPage } from '@/components/jobs/ProsPage';

export const metadata: Metadata = { title: '找工人｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { trade: string } }) {
  return <ProsPage trade={decodeURIComponent(params.trade)} />;
}
