import type { Metadata } from 'next';
import { JobsHome } from '@/components/jobs/JobsHome';

export const metadata: Metadata = { title: '找工人 · 接活｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <JobsHome />;
}
