'use client';
/**
 * 找工人列表页（藏蓝）。指令 9 · D27：到能办事的页顶多第二页——
 *   /zh/jobs/find                 「全部工种和服务」：顶上分组的工种标签（没人的标“招募中”），下面是人和公司列表；
 *   /zh/jobs/find?group=repair     首页入口指向一组：顶上一排这一组的工种标签；
 *   /zh/jobs/find?trade=plumbing   （或 /zh/jobs/find/plumbing 旧地址）直接是这个工种。
 * 点标签当场换（同一页，不跳页），地址栏同步 ?group=&trade= 便于分享；按城市筛选；底部固定"发布活儿"（预选选中的工种）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell, ReportButton, initial, trackJobs } from './shared';
import type { CityOpt, Meta, ProCard, Trade } from './types';

type ProsRes = { items: ProCard[]; cities: CityOpt[]; nextCursor?: string | null };

export function ProsPage({ trade: trade0, group: group0 }: { trade?: string | null; group?: string | null }) {
  const [trade, setTrade] = useState<string | null>(trade0 ?? null);
  useEffect(() => { setTrade(trade0 ?? null); }, [trade0]);
  return (
    <JobsShell
      side="find"
      need="find"
      back={{ href: '/zh/jobs', label: '‹ 找工人 · 接活' }}
      eyebrow="找工人／施工队"
      footer={() => (
        <BottomBar>
          <Link href={trade ? `/zh/jobs/post?trade=${encodeURIComponent(trade)}` : '/zh/jobs/post'} className={`${s.btn} ${j.btnFind}`}>发布活儿</Link>
        </BottomBar>
      )}
    >
      {(meta) => <FindBody meta={meta} trade={trade} setTrade={setTrade} group0={group0 ?? null} />}
    </JobsShell>
  );
}

function FindBody({ meta, trade, setTrade, group0 }: { meta: Meta; trade: string | null; setTrade: (t: string | null) => void; group0: string | null }) {
  const open = useMemo(() => meta.trades.filter((t) => t.open || meta.staffPreview), [meta]);
  const groups = useMemo(() => [...meta.groups].sort((a, b) => a.order - b.order), [meta]);
  // 只给了工种（旧地址 /find/<工种>）：顶上出这个工种所在的组
  const group = group0 && groups.some((g) => g.key === group0) ? group0 : null;
  const blocks = (group ? groups.filter((g) => g.key === group) : groups)
    .map((g) => ({ g, ts: open.filter((t) => t.group === g.key) }))
    .filter((b) => b.ts.length > 0);
  const sel = trade ? meta.trades.find((t) => t.key === trade) ?? null : null;
  const title = sel ? sel.name : group ? blocks[0]?.g.name ?? '找工人' : '全部工种和服务';

  function pick(t: string | null) {
    setTrade(t);
    if (t) trackJobs('jobs_trade', t);
    const u = new URL(window.location.href);
    if (u.pathname !== '/zh/jobs/find') u.pathname = '/zh/jobs/find';
    if (group) u.searchParams.set('group', group); else u.searchParams.delete('group');
    if (t) u.searchParams.set('trade', t); else u.searchParams.delete('trade');
    window.history.replaceState(null, '', `${u.pathname}${u.search}`);
  }
  const tab = (t: Trade) => (
    <button key={t.key} type="button" aria-pressed={trade === t.key} className={`${j.tradeTab} ${trade === t.key ? j.tradeTabOn : ''}`} onClick={() => pick(t.key)}>
      {t.name}
      {!t.hasPros && <span className={j.tradeTabTag}>{meta.recruitingLabel ?? '招募中'}</span>}
    </button>
  );

  return (
    <>
      <h1 className={s.h1}>{title}</h1>
      <div className={j.tabsBox} aria-label="工种">
        {group ? (
          <div className={`${j.tabRow} ${j.tabRowWrap}`}>
            <button type="button" aria-pressed={!trade} className={`${j.tradeTab} ${!trade ? j.tradeTabOn : ''}`} onClick={() => pick(null)}>全部{blocks[0]?.g.name ?? ''}</button>
            {blocks[0]?.ts.map(tab)}
          </div>
        ) : (
          <>
            <div className={j.tabRow} style={{ marginBottom: '0.5rem' }}>
              <button type="button" aria-pressed={!trade} className={`${j.tradeTab} ${!trade ? j.tradeTabOn : ''}`} onClick={() => pick(null)}>全部 {open.length} 项</button>
            </div>
            {blocks.map(({ g, ts }) => (
              <div key={g.key} className={j.tabGroup}>
                <p className={j.tabGroupName}>{g.name}</p>
                <div className={j.tabRow}>{ts.map(tab)}</div>
              </div>
            ))}
          </>
        )}
      </div>
      {/* J10-1：选中的工种有范围说明就在标签下面写一行（和小程序一致） */}
      {sel?.scope && <p className={s.small} style={{ margin: '-0.4rem 0 0.9rem' }}>{sel.name}：{sel.scope}</p>}
      {sel && sel.open && !sel.hasPros ? (
        <Recruiting name={sel.name} trade={sel.key} text={meta.tradeRecruitingText} />
      ) : (
        <ProsList
          query={trade ? { trade } : group ? { group } : {}}
          name={title}
        />
      )}
    </>
  );
}

function Recruiting({ name, trade, text }: { name: string; trade: string; text?: string }) {
  return (
    <>
      <div className={s.notice}>「{name}」：{text ?? '这个工种正在招募接活人'}。可以先发布活儿，有人登记通过后第一时间联系你；你是做这一行的，可以登记接活儿。</div>
      <div className={j.cardActions} style={{ marginTop: '1rem' }}>
        <Link href={`/zh/jobs/post?trade=${encodeURIComponent(trade)}`} className={`${s.btn} ${j.btnFind}`}>发布活儿</Link>
        <Link href="/zh/jobs/register" className={`${s.btn} ${j.btnWork}`}>登记接活儿</Link>
      </div>
    </>
  );
}

function ProsList({ query, name }: { query: Record<string, string>; name: string }) {
  const [city, setCity] = useState('');
  const [d, setD] = useState<ProsRes | null>(null);
  const [cities, setCities] = useState<CityOpt[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const qkey = JSON.stringify(query);
  useEffect(() => { setCity(''); }, [qkey]);

  const load = useCallback(async (cursor?: string) => {
    const q = new URLSearchParams(JSON.parse(qkey) as Record<string, string>);
    if (city) q.set('city', city);
    if (cursor) q.set('cursor', cursor);
    const r = await api<ProsRes>(`/api/v1/jobs/pros?${q}`);
    if (!r.ok) return setErr(r.message);
    setErr(null);
    setD((old) => (cursor && old ? { ...r.data, items: [...old.items, ...r.data.items] } : r.data));
    if (!city) setCities(r.data.cities ?? []);
    setMore(false);
  }, [qkey, city]);
  useEffect(() => { setD(null); load(); }, [load]);

  return (
    <>
      {cities.length > 1 && (
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

/** 复制到剪贴板（不支持时退回选中文字的老办法） */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const t = document.createElement('textarea');
      t.value = text;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(t);
      return ok;
    } catch {
      return false;
    }
  }
}

/** 指令 7 · D17：点「联系」不用登录、不用验证手机，直接出「拨号」「复制电话」「复制微信号」（有微信号才出） */
export function ProCardView({ p }: { p: ProCard }) {
  const [phone, setPhone] = useState<{ phone: string | null; wechat?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  async function contact() {
    setBusy(true);
    setErr(null);
    const r = await api<{ phone: string | null; wechat?: string | null }>(`/api/v1/jobs/pros/${p.id}/contact`, { method: 'POST' });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setPhone(r.data);
  }
  async function copy(text: string, what: string) {
    setCopied((await copyText(text)) ? `${what}已复制` : `没能复制，请长按上面的${what}自己复制`);
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
          {phone.phone ? <>电话：<span className={s.mono}>{phone.phone}</span></> : '（没留电话）'}
          {phone.wechat && <><br />微信号：<span className={s.mono}>{phone.wechat}</span></>}
          <div className={j.cardActions}>
            {phone.phone && <a className={`${s.btn} ${j.btnFind}`} href={`tel:${phone.phone}`}>拨号</a>}
            {phone.phone && <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => copy(phone.phone!, '电话')}>复制电话</button>}
            {phone.wechat && <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => copy(phone.wechat!, '微信号')}>复制微信号</button>}
          </div>
          {copied && <p className={s.small} role="status" style={{ margin: '0.3rem 0 0' }}>{copied}</p>}
          <p className={s.small} style={{ margin: '0.3rem 0 0' }}>请自己和对方谈清楚价钱、合同和付款。</p>
        </div>
      ) : null}
      {err && <div className={s.error} style={{ marginTop: '0.6rem' }}>{err}</div>}
      <div className={j.cardActions}>
        {!phone && (
          <button type="button" className={`${s.btn} ${j.btnFind}`} disabled={busy} onClick={contact}>{busy ? '正在获取…' : '联系'}</button>
        )}
        <ReportButton targetType="pro" targetId={p.id} />
      </div>
    </article>
  );
}
