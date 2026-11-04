import type { Metadata } from 'next';
import { RegisterDone } from '@/components/crm/RegisterDone';

export const metadata: Metadata = { title: '报名成功｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params, searchParams }: { params: { slug: string }; searchParams: { task?: string; msg?: string } }) {
  return <RegisterDone slug={params.slug} taskId={searchParams.task ?? null} msg={searchParams.msg ?? null} />;
}
