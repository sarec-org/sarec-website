import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Renew } from '@/components/jobs/Renew';

export const metadata: Metadata = { title: '续期活儿｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  return <Suspense><Renew id={params.id} /></Suspense>;
}
