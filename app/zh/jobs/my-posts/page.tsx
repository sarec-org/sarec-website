import type { Metadata } from 'next';
import { MyPosts } from '@/components/jobs/MyPosts';

export const metadata: Metadata = { title: '我发的活儿｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <MyPosts />;
}
