import type { Metadata } from 'next';
import { ProsPage } from '@/components/jobs/ProsPage';

export const metadata: Metadata = { title: '找工人｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** 指令 9 · D27：找工人列表页（?group= 一组的工种标签；不带 = 全部工种和服务；?trade= 选中某个工种） */
export default function Page({ searchParams }: { searchParams: { group?: string; trade?: string } }) {
  return <ProsPage group={searchParams.group ?? null} trade={searchParams.trade ?? null} />;
}
