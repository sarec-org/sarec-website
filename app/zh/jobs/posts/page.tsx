import type { Metadata } from 'next';
import { PostsList } from '@/components/jobs/PostsList';

export const metadata: Metadata = { title: '全部活儿｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <PostsList />;
}
