'use client';
/** /zh/jobs/find/[trade]：这个工种的人和公司（藏蓝），按城市筛选；底部固定"发布活儿"（预选这个工种） */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell, ReportButton, initial, tradeName } from './shared';
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
      {(meta) => {
        const t = meta.trades.find((x) => x.key === trade);
        // D11：这个工种还没有核验通过的人 → "这个工种正在招募接活人" + 发布活儿 / 登记接活
        if (t && t.open && !t.hasPros) return <Recruiting name={t.name} trade={trade} text={meta.tradeRecruitingText} />;
        return <ProsList trade={trade} name={tradeName(meta, trade)} />;
      }}
    </JobsShell>
  );
}

function Recruiting({ name, trade, text }: { name: string; trade: string; text?: string }) {
  return (
    <>
      <h1 className={s.h1}>{name}</h1>
      <div className={s.notice}>{text ?? '这个工种正在招募接活人'}。可以先发布活儿，有人登记通过后第一时间联系你；你是做这一行的，可以登记接活。</div>
      <div className={j.cardActions} style={{ marginTop: '1rem' }}>
        <Link href={`/zh/jobs/post?trade=${encodeURIComponent(trade)}`} className={`${s.btn} ${j.btnFind}`}>发布活儿</Link>
        <Link href="/zh/jobs/register" className={`${s.btn} ${j.btnWork}`}>登记接活</Link>
      </div>
    </>
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
