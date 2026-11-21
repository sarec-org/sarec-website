'use client';
/** 活儿卡片（接活这边，金色）：标题、描述前两行、时间要求、预算（有才显示）、发布时间、联系发布人、反馈/投诉 */
import Link from 'next/link';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { ago, ReportButton } from './shared';
import type { PostCard } from './types';

export function PostCardView({ p }: { p: PostCard }) {
  return (
    <article className={j.card} style={{ borderLeft: '3px solid var(--gold)' }}>
      <Link href={`/zh/jobs/posts/${p.id}`} className={j.title}>{p.title}</Link>
      <p className={j.desc2}>{p.summary}</p>
      <p className={j.meta}>
        {p.timingLabel}
        {p.budget ? ` · 预算 ${p.budget}` : ''}
        {p.crew?.pay ? ` · ${p.crew.pay}` : ''}
        {` · ${ago(p.createdAt)}发布`}
      </p>
      <div className={j.cardActions}>
        <Link href={`/zh/jobs/posts/${p.id}#contact`} className={`${s.btn} ${j.btnWork}`}>联系发布人</Link>
        <ReportButton targetType="post" targetId={p.id} />
      </div>
    </article>
  );
}
