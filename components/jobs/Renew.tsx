'use client';
/** /zh/jobs/renew/[id]?t=：短信里的"一键续期"（不用登录）。点一下续 14 天 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api, fmtDate } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, Disclaimer } from './shared';
import type { PostCard } from './types';

export function Renew({ id }: { id: string }) {
  const t = useSearchParams().get('t') ?? '';
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<PostCard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setErr(null);
    const r = await api<{ post: PostCard }>(`/api/v1/jobs/posts/${id}`, { method: 'PATCH', body: { renew: true, token: t } });
    setBusy(false);
    if (!r.ok) return setErr(r.status === 401 || r.status === 403 ? '这个续期链接不对或已经失效。登录后可以在「我发的活儿」里续期。' : r.message);
    setDone(r.data.post);
  }
  return (
    <div className={`${s.page} ${j.find}`}>
      <p className={s.eyebrow}>找工人／施工队</p>
      <h1 className={s.h1}>{done ? '续好了' : '续期活儿'}</h1>
      {done ? (
        <>
          <div className={s.success}>「{done.title}」已续期，{fmtDate(done.expiresAt)} 之前会继续显示给接活的人。</div>
          <Link href="/zh/jobs/my-posts" className={`${s.btn} ${j.btnFind} ${s.btnBlock}`}>看我发的活儿</Link>
        </>
      ) : (
        <>
          <p className={s.lead}>点下面的按钮，这条活儿再显示 14 天。已经找到人的，就不用续了。</p>
          {err && <div className={s.error}>{err} <Link href="/zh/jobs/my-posts" style={{ color: 'var(--gold)' }}>去「我发的活儿」›</Link></div>}
          {!t && <div className={s.notice}>链接不完整。登录后可以在<Link href="/zh/jobs/my-posts" style={{ color: 'var(--gold)' }}>「我发的活儿」</Link>里续期。</div>}
          <BottomBar>
            <button type="button" className={`${s.btn} ${j.btnFind}`} disabled={busy || !t} onClick={go}>{busy ? '正在续期…' : '续期 14 天'}</button>
          </BottomBar>
        </>
      )}
      <Disclaimer />
    </div>
  );
}
