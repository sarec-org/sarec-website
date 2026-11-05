import type { Metadata } from 'next';
import { EventRegister } from '@/components/crm/EventRegister';
import { AgentChat } from '@/components/agent/AgentChat';

export const metadata: Metadata = { title: '活动报名｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ params, searchParams }: { params: { slug: string }; searchParams: { ref?: string; ch?: string } }) {
  return (
    <>
      <EventRegister slug={params.slug} refCode={searchParams.ref ?? null} channel={searchParams.ch ?? null} />
      <AgentChat variant="launcher" context={{ page: 'event', slug: params.slug }} />
    </>
  );
}
