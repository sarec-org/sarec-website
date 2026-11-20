import type { Metadata } from 'next';
import { MyPro } from '@/components/jobs/MyPro';

export const metadata: Metadata = { title: '我的接活｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <MyPro />;
}
