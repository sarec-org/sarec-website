import type { Metadata } from 'next';
import { WebCardPublic } from '@/components/home/WebCard';

export const metadata: Metadata = { title: '电子名片｜SAREC 中美房地产商会', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { token: string } }) {
  return <WebCardPublic token={params.token} />;
}
