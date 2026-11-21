import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProRegister } from '@/components/jobs/ProRegister';

export const metadata: Metadata = { title: '登记接活儿｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Suspense><ProRegister /></Suspense>;
}
