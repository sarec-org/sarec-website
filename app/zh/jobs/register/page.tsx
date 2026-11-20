import type { Metadata } from 'next';
import { ProRegister } from '@/components/jobs/ProRegister';

export const metadata: Metadata = { title: '登记接活｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <ProRegister />;
}
