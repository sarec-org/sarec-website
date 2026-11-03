import type { Metadata } from 'next';
import { MyPage } from '@/components/crm/MyPage';

export const metadata: Metadata = { title: '我的｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <MyPage />;
}
