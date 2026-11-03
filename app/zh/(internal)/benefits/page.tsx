import type { Metadata } from 'next';
import { BenefitsPage } from '@/components/crm/Venue';

export const metadata: Metadata = { title: '会员权益｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <BenefitsPage />;
}
