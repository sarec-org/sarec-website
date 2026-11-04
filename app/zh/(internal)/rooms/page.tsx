import type { Metadata } from 'next';
import { RoomsPage } from '@/components/crm/Venue';

export const metadata: Metadata = { title: '会议室预约｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <RoomsPage />;
}
