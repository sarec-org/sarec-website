import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PostDone } from '@/components/jobs/PostDone';

export const metadata: Metadata = { title: '发好了｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Suspense><PostDone /></Suspense>;
}
