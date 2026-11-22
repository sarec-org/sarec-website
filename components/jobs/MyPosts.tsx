'use client';
/** /zh/jobs/my-posts：我发的活儿（藏蓝）——看、改、关、续期、谁联系过 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate, fmtDateTime } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell, NeedLogin, Pick } from './shared';
import { BUDGETS } from './labels';
import type { Meta, MyPost, Timing } from './types';

export function MyPosts() {
  return (
    <JobsShell
      side="find"
      need="find"
      eyebrow="找工人／施工队"
      title="我发的活儿"
      footer={() => (
        <BottomBar>
          <Link href="/zh/jobs/post" className={`${s.btn} ${j.btnFind}`}>再发一条活儿</Link>
        </BottomBar>
      )}
    >
      {(meta) => (
        <>
          <p className={s.small} style={{ marginTop: 0 }}>登记了接活儿的，看<Link href="/zh/jobs/mine" style={{ color: 'var(--ivory)' }}>「我的接活儿」›</Link></p>
          <Mine meta={meta} />
        </>
      )}
    </JobsShell>
  );
}

function Mine({ meta }: { meta: Meta }) {
  const [items, setItems] = useState<MyPost[] | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ items: MyPost[] }>('/api/v1/jobs/me/posts');
    if (!r.ok) return r.status === 401 ? setNeedLogin(true) : setErr(r.message);
    setNeedLogin(false);
    setErr(null);
    setItems(r.data.items);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (needLogin) return <NeedLogin why="登录后看你发过的活儿。" onDone={load} />;
  if (err) return <div className={s.error}>{err} <button className={j.linkBtn} onClick={load}>再试一次</button></div>;
  if (!items) return <p className={s.muted}>正在加载…</p>;
  if (items.length === 0) return <div className={s.notice}>你还没有发过活儿。点下面“再发一条活儿”，说清要干什么，等人联系。</div>;
  return (
    <>
      {msg && <div className={s.success}>{msg}</div>}
      {items.map((p) => <MyPostItem key={p.id} p={p} meta={meta} onDone={(t) => { setMsg(t); load(); }} />)}
    </>
  );
}

function MyPostItem({ p, meta, onDone }: { p: MyPost; meta: Meta; onDone: (t: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(p.description);
  const [timing, setTiming] = useState<Timing>(p.timing);
  const [budget, setBudget] = useState(p.budget ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const daysLeft = Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 86400000);
  const live = p.status === 'open' && daysLeft > 0;
  const label = p.expired ? '已到期下架' : p.status === 'open' && daysLeft <= 0 ? '已到期' : p.statusLabel;
  async function patch(b: Record<string, unknown>, ok: string) {
    setBusy(true);
    setErr(null);
    const r = await api(`/api/v1/jobs/posts/${p.id}`, { method: 'PATCH', body: b });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setEdit(false);
    onDone(ok);
  }
  return (
    <article className={j.card}>
      <Link href={`/zh/jobs/posts/${p.id}`} className={j.title}>{p.title}</Link>
      <p className={j.meta}>
        <span className={`${j.tag} ${j.tagSide}`}>{label}</span>
        {live && (daysLeft <= 2 ? ` ${daysLeft} 天后自动下架，要继续找人请续期` : ` ${fmtDate(p.expiresAt)} 自动下架（还有 ${daysLeft} 天）`)}
        {` · 已通知 ${p.notifiedCount} 人`}
      </p>
      {!edit ? (
        <p className={j.desc2}>{p.description || p.summary}</p>
      ) : (
        <div style={{ marginTop: '0.6rem' }}>
          <div className={s.field}><label className={s.label} htmlFor={`mp-${p.id}`}>说说情况</label><textarea id={`mp-${p.id}`} className={s.textarea} value={text} onChange={(e) => setText(e.target.value)} /></div>
          <div className={s.field}><span className={s.label}>什么时候要</span><Pick options={meta.options.timings.map((x) => ({ value: x.key, label: x.label }))} value={[timing]} onChange={(v) => setTiming(v[0])} /></div>
          <div className={s.field}><span className={s.label}>预算范围（选填）</span><Pick options={BUDGETS.map((x) => ({ value: x, label: x }))} value={budget ? [budget] : []} onChange={(v) => setBudget(v[0] === budget ? '' : v[0])} /></div>
        </div>
      )}
      <p className={s.small} style={{ margin: '0.6rem 0 0.2rem' }}>谁联系过（看过你的电话）：{p.contacts.length ? `${p.contacts.length} 人` : '还没有人'}</p>
      {p.contacts.length > 0 && (
        <ul className={s.list}>
          {p.contacts.map((c, i) => (
            <li key={i} className={s.small} style={{ padding: '0.3rem 0', borderBottom: '1px solid var(--line-2)' }}>
              <b style={{ color: 'var(--ivory)' }}>{c.name}</b>{c.roleLabel ? ` · ${c.roleLabel}` : ''} · {fmtDateTime(c.at)}{c.times > 1 ? ` · 看了 ${c.times} 次` : ''}
            </li>
          ))}
        </ul>
      )}
      {err && <div className={s.error}>{err}</div>}
      <div className={j.cardActions}>
        {edit ? (
          <>
            <button className={`${s.btn} ${j.btnFind}`} disabled={busy} onClick={() => patch({ description: text.trim(), timing, budget: budget || null }, '改好了')}>保存</button>
            <button className={`${s.btn} ${s.btnQuiet}`} onClick={() => setEdit(false)}>不改了</button>
          </>
        ) : p.status === 'removed' ? (
          <p className={s.small} style={{ margin: 0 }}>这条活儿被工作人员下架了，有疑问请联系商会。</p>
        ) : (
          <>
            {live && <button className={`${s.btn} ${j.btnFind}`} disabled={busy} onClick={() => patch({ status: 'found' }, '已标为"已找到"，这条活儿不再显示给别人')}>已找到</button>}
            {(p.status === 'open' || p.expired) && (
              <button className={`${s.btn} ${j.btnFindGhost}`} disabled={busy} onClick={() => patch({ renew: true }, '已续期 14 天')}>续期 14 天</button>
            )}
            {live && <button className={`${s.btn} ${s.btnQuiet}`} onClick={() => setEdit(true)}>改</button>}
            {live && <button className={`${s.btn} ${s.btnQuiet}`} disabled={busy} onClick={() => patch({ status: 'closed' }, '已关闭')}>关闭</button>}
            {(p.status === 'found' || (p.status === 'closed' && !p.expired)) && <button className={`${s.btn} ${s.btnQuiet}`} disabled={busy} onClick={() => patch({ status: 'open' }, '已重新打开，继续找人')}>重新找人</button>}
          </>
        )}
      </div>
    </article>
  );
}
