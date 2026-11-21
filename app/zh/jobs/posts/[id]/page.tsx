import type { Metadata } from 'next';
import { PostDetail } from '@/components/jobs/PostDetail';

export const metadata: Metadata = { title: '活儿详情｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  return <PostDetail id={params.id} />;
}
