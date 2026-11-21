import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PostForm } from '@/components/jobs/PostForm';

export const metadata: Metadata = { title: '发布活儿｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Suspense><PostForm /></Suspense>;
}
