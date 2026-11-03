import type { Metadata } from 'next';
import Link from 'next/link';
import { ProfileFlow } from '@/components/crm/ProfileFlow';
import s from '@/components/crm/crm.module.css';

export const metadata: Metadata = { title: '我的资料｜SAREC', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className={s.page}>
      <Link href="/zh/me" className={s.back}>‹ 我的</Link>
      <p className={s.eyebrow}>PROFILE · 资料中心</p>
      <h1 className={s.h1}>完善我的资料</h1>
      <p className={s.muted}>一屏一题，可跳过，随时点“完成”。资料越完整，商会推荐的活动和合作越对口。</p>
      <ProfileFlow doneHref="/zh/me" doneLabel="回到我的" />
    </div>
  );
}
