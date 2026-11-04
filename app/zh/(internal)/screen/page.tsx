import type { Metadata } from 'next';
import { ScreenApply } from '@/components/crm/Venue';

export const metadata: Metadata = { title: '电子屏展示申请｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <ScreenApply />;
}
