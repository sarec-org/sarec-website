'use client';
/** /zh/jobs/find/[trade]：这个工种的人和公司（藏蓝），按城市筛选；底部固定"发布活儿"（预选这个工种） */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell, NeedLogin, ReportButton, initial, tradeName } from './shared';
import type { CityOpt, ProCard } from './types';

type ProsRes = { items: ProCard[]; cities: CityOpt[]; nextCursor?: string | null };

export function ProsPage({ trade }: { trade: string }) {
  return (
    <JobsShell
      side="find"
      need="find"
      back={{ href: '/zh/jobs/trades', label: '‹ 全部工种和服务' }}
      eyebrow="找工人／施工队"
      footer={() => (
        <BottomBar>
          <Link href={`/zh/jobs/post?trade=${encodeURIComponent(trade)}`} className={`${s.btn} ${j.btnFind}`}>发布活儿</Link>
        </BottomBar>
      )}
    >
      {(meta) => <ProsList trade={trade} name={tradeName(meta, trade)} />}
    </JobsShell>
  );
}

function ProsList({ trade, name }: { trade: string; name: string }) {
  const [city, setCity] = useState('');
  const [d, setD] = useState<ProsRes | null>(null);
  const [cities, setCities] = useState<CityOpt[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    const q = new URLSearchParams({ trade });
    if (city) q.set('city', city);
    if (cursor) q.set('cursor', cursor);
    const r = await api<ProsRes>(`/api/v1/jobs/pros?${q}`);
    if (!r.ok) return setErr(r.message);
    setErr(null);
    setD((old) => (cursor && old ? { ...r.data, items: [...old.items, ...r.data.items] } : r.data));
    if (!city) setCities(r.data.cities ?? []);
    setMore(false);
  }, [trade, city]);
  useEffect(() => { setD(null); load(); }, [load]);

  return (
    <>
      <h1 className={s.h1}>{name}</h1>
      {cities.length > 0 && (
        <div className={j.opts} style={{ margin: '0 0 1rem' }} aria-label="按城市筛选">
          <button type="button" className={`${j.opt} ${!city ? j.optOn : ''}`} onClick={() => setCity('')}>全部城市</button>
          {cities.map((c) => (
            <button key={c.key} type="button" className={`${j.opt} ${city === c.key ? j.optOn : ''}`} onClick={() => setCity(c.key)}>{c.name}</button>
          ))}
        </div>
      )}
      {err && <div className={s.error}>{err} <button className={j.linkBtn} onClick={() => load()}>再试一次</button></div>}
      {!d && !err && <p className={s.muted}>正在加载…</p>}
      {d && d.items.length === 0 && (
        <div className={s.notice}>
          {city ? `${cities.find((c) => c.key === city)?.name ?? city} 暂时还没有做「${name}」的人。` : `「${name}」暂时还没有核验通过的人。`}先发布活儿，有人登记通过后第一时间联系你。
        </div>
      )}
      {d?.items.map((p) => <ProCardView key={p.id} p={p} />)}
      {d?.nextCursor && (
        <button className={`${s.btn} ${s.btnQuiet} ${s.btnBlock}`} disabled={more} onClick={() => { setMore(true); load(d.nextCursor ?? undefined); }}>
          {more ? '正在加载…' : '再看更多'}
        </button>
      )}
    </>
  );
}

export function ProCardView({ p }: { p: ProCard }) {
  const [phone, setPhone] = useState<{ phone: string; wechat?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  async function contact() {
    setBusy(true);
    setErr(null);
    const r = await api<{ phone: string; wechat?: string | null }>(`/api/v1/jobs/pros/${p.id}/contact`, { method: 'POST' });
    setBusy(false);
    if (!r.ok) return r.status === 401 ? setNeedLogin(true) : setErr(r.message);
    setNeedLogin(false);
    setPhone(r.data);
  }
  return (
    <article className={j.card}>
      <div className={j.cardHead}>
        {p.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar} alt="" className={j.avatar} />
        ) : (
          <span className={j.avatar} aria-hidden>{initial(p.name)}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <p className={j.name}>{p.name}</p>
          <span className={`${j.tag} ${j.tagSide}`}>{p.roleLabel}</span>
          {p.availableNow && <span className={`${j.tag} ${j.badgeOk}`}>现在有空</span>}
        </div>
      </div>
      <p className={j.meta}>
        {p.trades.join('、')}
        {p.cities.length > 0 && <><br />服务城市：{p.cities.join('、')}</>}
        {p.years ? <><br />干了 {p.years} 年</> : null}
        {p.licenseNo ? <><br />牌照号 <span className={s.mono}>{p.licenseNo}</span></> : null}
      </p>
      {p.intro && <p className={j.desc2}>{p.intro}</p>}
      {p.languages.length > 0 && <p className={j.meta}>会说：{p.languages.join('、')}{p.teamSize ? ` · 团队 ${p.teamSize} 人` : ''}</p>}
      {p.badges.length > 0 && (
        <div>
          {p.badges.map((b) => (
            <span key={b.kind + b.text} className={`${j.badge} ${b.kind === 'license' || b.kind === 'member' ? j.badgeOk : ''}`}>{b.text}</span>
          ))}
        </div>
      )}
      {phone ? (
        <div className={j.phoneBox}>
          电话：<a href={`tel:${phone.phone}`}>{phone.phone}</a>
          {phone.wechat && <><br />微信：<span className={s.mono}>{phone.wechat}</span></>}
          <p className={s.small} style={{ margin: '0.3rem 0 0' }}>请自己和对方谈清楚价钱、合同和付款。</p>
        </div>
      ) : needLogin ? (
        <NeedLogin why="登录后才能看到联系电话（用邮箱或手机收验证码，不用密码）。" onDone={contact} />
      ) : null}
      {err && <div className={s.error} style={{ marginTop: '0.6rem' }}>{err}</div>}
      <div className={j.cardActions}>
        {!phone && !needLogin && (
          <button type="button" className={`${s.btn} ${j.btnFind}`} disabled={busy} onClick={contact}>{busy ? '正在获取…' : '联系（看电话）'}</button>
        )}
        <ReportButton targetType="pro" targetId={p.id} />
      </div>
    </article>
  );
}
