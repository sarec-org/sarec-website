import type { Metadata } from 'next';
import { ProsPage } from '@/components/jobs/ProsPage';
import { getPool } from '@/lib/db/client';

export const metadata: Metadata = { title: '找工人｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** 旧地址 /zh/jobs/find/<工种>（通知、分享出去的链接）：同一个列表页，顶上是这个工种所在那一组的标签 */
export default async function Page({ params }: { params: { trade: string } }) {
  const trade = decodeURIComponent(params.trade);
  const { rows } = await getPool().query<{ group_key: string }>(`SELECT group_key FROM jobs_trades WHERE key = $1`, [trade]).catch(() => ({ rows: [] as { group_key: string }[] }));
  return <ProsPage trade={trade} group={rows[0]?.group_key ?? null} />;
}
