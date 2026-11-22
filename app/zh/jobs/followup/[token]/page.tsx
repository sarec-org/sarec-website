import type { Metadata } from 'next';
import { Followup } from '@/components/jobs/Followup';

export const metadata: Metadata = { title: '回访｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { token: string } }) {
  return <Followup token={params.token} />;
}
