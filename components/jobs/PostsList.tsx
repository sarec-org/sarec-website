'use client';
/** /zh/jobs/posts：看全部活儿（金色），按工种和城市筛选；底部固定"登记接活"（已登记显示"我的接活"） */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell } from './shared';
import { PostCardView } from './PostCardView';
import type { Meta, PostCard } from './types';

type Res = { items: PostCard[]; cities?: string[]; nextCursor?: string | null };

export function PostsList() {
  return (
    <JobsShell
      side="work"
      need="work"
      eyebrow="我要接活"
      title="全部活儿"
      footer={(meta) => (
        <BottomBar>
          {meta.me?.pro ? (
            <Link href="/zh/jobs/mine" className={`${s.btn} ${j.btnWork}`}>我的接活</Link>
          ) : (
            <Link href="/zh/jobs/register" className={`${s.btn} ${j.btnWork}`}>登记接活</Link>
          )}
        </BottomBar>
      )}
    >
      {(meta) => <List meta={meta} />}
    </JobsShell>
  );
}

function List({ meta }: { meta: Meta }) {
  const [trade, setTrade] = useState('');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [d, setD] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [showTrades, setShowTrades] = useState(false);
  const load = useCallback(async (cursor?: string) => {
    const q = new URLSearchParams();
    if (trade) q.set('trade', trade);
    if (city) q.set('city', city);
    if (cursor) q.set('cursor', cursor);
    const r = await api<Res>(`/api/v1/jobs/posts?${q}`);
    setMore(false);
    if (!r.ok) return setErr(r.message);
    setErr(null);
    setD((old) => (cursor && old ? { ...r.data, items: [...old.items, ...r.data.items] } : r.data));
    if (!city && r.data.cities) setCities(r.data.cities);
  }, [trade, city]);
  useEffect(() => { setD(null); load(); }, [load]);

  const groups = [...meta.groups].sort((a, b) => a.order - b.order);
  const tradeLabel = meta.trades.find((t) => t.key === trade)?.name;
  return (
    <>
      <div className={j.opts} style={{ marginBottom: '0.6rem' }}>
        <button type="button" className={`${j.opt} ${!trade ? j.optOn : ''}`} onClick={() => { setTrade(''); setShowTrades(false); }}>全部工种</button>
        <button type="button" className={`${j.opt} ${trade ? j.optOn : ''}`} onClick={() => setShowTrades((x) => !x)}>
          {tradeLabel ? `${tradeLabel} ▾` : '选工种 ▾'}
        </button>
      </div>
      {showTrades && (
        <div className={s.card}>
          {groups.map((g) => {
            const ts = meta.trades.filter((t) => t.group === g.key && t.open);
            if (!ts.length) return null;
            return (
              <div key={g.key}>
                <p className={s.small} style={{ margin: '0.5rem 0 0.3rem' }}>{g.name}</p>
                <div className={j.opts}>
                  {ts.map((t) => (
                    <button key={t.key} type="button" className={`${j.opt} ${trade === t.key ? j.optOn : ''}`} onClick={() => { setTrade(t.key); setShowTrades(false); }}>{t.name}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {cities.length > 0 && (
        <div className={j.opts} style={{ marginBottom: '1rem' }} aria-label="按城市筛选">
          <button type="button" className={`${j.opt} ${!city ? j.optOn : ''}`} onClick={() => setCity('')}>全部城市</button>
          {cities.map((c) => (
            <button key={c} type="button" className={`${j.opt} ${city === c ? j.optOn : ''}`} onClick={() => setCity(c)}>{c}</button>
          ))}
        </div>
      )}
      {err && <div className={s.error}>{err} <button className={j.linkBtn} onClick={() => load()}>再试一次</button></div>}
      {!d && !err && <p className={s.muted}>正在加载…</p>}
      {d && d.items.length === 0 && (
        <div className={s.notice}>
          {trade || city ? '这个条件下暂时没有活儿，换个工种或城市看看。' : '暂时没有新活儿，先登记，有活儿第一时间通知你。'}
        </div>
      )}
      {d?.items.map((p) => <PostCardView key={p.id} p={p} />)}
      {d?.nextCursor && (
        <button className={`${s.btn} ${s.btnQuiet} ${s.btnBlock}`} disabled={more} onClick={() => { setMore(true); load(d.nextCursor ?? undefined); }}>
          {more ? '正在加载…' : '再看更多'}
        </button>
      )}
    </>
  );
}
