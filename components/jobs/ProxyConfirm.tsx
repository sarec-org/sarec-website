'use client';
/**
 * /zh/jobs/confirm/[token]：商会工作人员帮师傅登记了接活儿资料，师傅本人点确认短信里的链接到这里。
 * 不用登录（链接带签名的一次性令牌）。三个出路：没问题确认 / 我要修改（走正常登记页，登录后资料自动带入）/ 不是我、不用登记。
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { Disclaimer } from './shared';

type V = {
  pro: { name: string; roleLabel: string; trades: string[]; cities: string[]; years: number | null; licenseNo: string | null; businessRegNo: string | null; intro: string | null; statusLabel: string };
  phoneMasked: string | null; rules: string[]; editUrl: string; editHint: string;
};

export function ProxyConfirm({ token }: { token: string }) {
  const [v, setV] = useState<V | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; declined?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [askDecline, setAskDecline] = useState(false);
  useEffect(() => {
    api<V>(`/api/v1/jobs/confirm/${encodeURIComponent(token)}`).then((r) => (r.ok ? setV(r.data) : setErr(r.message)));
  }, [token]);
  async function act(action: 'confirm' | 'decline') {
    setBusy(true);
    const r = await api<{ message: string; declined?: boolean }>(`/api/v1/jobs/confirm/${encodeURIComponent(token)}`, { body: { action } });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setDone(r.data);
  }
  const row = (label: string, value: string | number | null | undefined) =>
    value === null || value === undefined || value === '' ? null : (
      <div style={{ display: 'flex', gap: 12, padding: '0.45rem 0', borderBottom: '1px solid var(--line, rgba(0,0,0,0.08))' }}>
        <span className={s.small} style={{ minWidth: '5.5em' }}>{label}</span><span>{value}</span>
      </div>
    );
  return (
    <div className={`${s.page} ${j.work}`}>
      <p className={s.eyebrow}>找工人 · 接活儿</p>
      <h1 className={s.h1}>确认你的接活儿资料</h1>
      {err && <div className={s.error}>{err}</div>}
      {err && <Link href="/zh/jobs/mine" className={`${s.btn} ${s.btnBlock}`}>去「我的接活儿」</Link>}
      {!v && !err && <p className={s.muted}>正在加载…</p>}
      {done && (
        <>
          <div className={s.success}>{done.message}</div>
          <Link href="/zh/jobs" className={`${s.btn} ${s.btnBlock}`}>回找工人 · 接活儿</Link>
        </>
      )}
      {v && !done && !err && (
        <>
          <p className={s.lead}>商会工作人员帮你登记了下面这份接活儿资料。请看一下对不对。</p>
          <div className={s.card}>
            {row('名称', v.pro.name)}
            {row('身份', v.pro.roleLabel)}
            {row('能做的工种', v.pro.trades.join('、'))}
            {row('服务城市', v.pro.cities.join('、'))}
            {row('从业年限', v.pro.years != null ? `${v.pro.years} 年` : null)}
            {row('牌照 / 执照号', v.pro.licenseNo)}
            {row('营业登记号', v.pro.businessRegNo)}
            {row('电话', v.phoneMasked)}
            {row('介绍', v.pro.intro)}
            {row('现在状态', v.pro.statusLabel)}
          </div>
          <details style={{ margin: '0.8rem 0' }}>
            <summary className={s.small} style={{ cursor: 'pointer', minHeight: 36 }}>登记规则（点开看）</summary>
            <ul className={s.small}>{v.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </details>
          <button className={`${s.btn} ${s.btnBlock}`} disabled={busy} onClick={() => act('confirm')}>没问题，确认（同意登记规则）</button>
          <Link href={v.editUrl} className={`${s.btn} ${s.btnGhost} ${s.btnBlock}`} style={{ marginTop: 10 }}>我要修改</Link>
          <p className={s.small}>{v.editHint}</p>
          {askDecline ? (
            <div className={s.notice} style={{ marginTop: 12 }}>
              <p style={{ margin: '0 0 0.6rem' }}>确定不用登记吗？点了以后这份资料会撤下，不会出现在找工人列表里。</p>
              <div className={s.btnRow}>
                <button className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={() => act('decline')}>确定，不用登记</button>
                <button className={`${s.btn} ${s.btnQuiet}`} onClick={() => setAskDecline(false)}>再想想</button>
              </div>
            </div>
          ) : (
            <button className={`${s.btn} ${s.btnQuiet} ${s.btnBlock}`} style={{ marginTop: 12 }} onClick={() => setAskDecline(true)}>不是我 / 不用登记</button>
          )}
        </>
      )}
      <Disclaimer />
    </div>
  );
}
