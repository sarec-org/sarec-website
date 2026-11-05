import type { Metadata } from 'next';
import { WebCardEditor } from '@/components/home/WebCard';

export const metadata: Metadata = { title: '我的名片｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <WebCardEditor />;
}
