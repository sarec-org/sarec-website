'use client';
/**
 * 电子名片（网站版）：编辑 + 预览；公开页实时显示当前会员状态（过期即显示已过期）。
 * 只有有效缴费会员显示“SAREC 正式会员”+ 等级 + 有效期；注册用户显示“SAREC 注册用户”。
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import s from '@/components/crm/crm.module.css';
import { api } from '@/components/crm/client';
import { trackWeb } from './HomeDesk';

type Status = { label: string; isMember: boolean; tierName: string | null; endDate: string | null; expired: boolean };
type Card = {
  token: string; name: string; avatarUrl: string | null; roleLabel: string | null; company: string | null; title: string | null; intro: string | null;
  phone: string | null; email: string | null; wechatId: string | null; status: Status;
  showPhone?: boolean; showEmail?: boolean; showWechat?: boolean;
};

const fmt = (d: string) => { const [y, m, dd] = d.split('-'); return `${y} 年 ${Number(m)} 月 ${Number(dd)} 日`; };

export function CardFace({ c, preview }: { c: Card; preview?: boolean }) {
  const phone = preview ? (c.showPhone ? c.phone : null) : c.phone;
  const email = preview ? (c.showEmail ? c.email : null) : c.email;
  const wechat = preview ? (c.showWechat ? c.wechatId : null) : c.wechatId;
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid rgba(201,165,103,0.65)', padding: '28px 26px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', overflow: 'hidden', maxWidth: 640 }}>
      <div aria-hidden="true" style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(201,165,103,0.18)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: 'var(--gold)' }}>{c.status.isMember ? `SAREC · 正式会员${c.status.tierName ? ' · ' + c.status.tierName : ''}` : c.status.label}</div>
          {c.status.isMember && c.status.endDate && <div className={s.small}>有效期至 {fmt(c.status.endDate)}</div>}
          {c.status.expired && <div className={s.small} style={{ color: '#e7a1a1' }}>会籍已过期{c.status.endDate ? `（${fmt(c.status.endDate)}）` : ''}</div>}
        </div>
        <div style={{ fontFamily: 'var(--serif-zh)', fontSize: 14, letterSpacing: 2, color: 'var(--ivory-mute)' }}>中美房地产商会</div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--serif-zh)', fontSize: 30, fontWeight: 600, letterSpacing: 2 }}>{c.name || '您的姓名'}</div>
        <div style={{ fontSize: 14, color: 'var(--gold)', marginTop: 6 }}>{[c.title, c.company].filter(Boolean).join(' · ') || c.roleLabel || ''}</div>
      </div>
      {c.intro && <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ivory-mute)' }}>{c.intro}</div>}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--ivory-faint)' }}>
        {phone && <a href={`tel:${phone}`} style={{ color: 'inherit' }}>{phone}</a>}
        {email && <a href={`mailto:${email}`} style={{ color: 'inherit' }}>{email}</a>}
        {wechat && <span>微信 · {wechat}</span>}
      </div>
    </div>
  );
}

export function WebCardEditor() {
  const [c, setC] = useState<Card | null>(null);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState('');
  useEffect(() => {
    api<{ card: Card }>('/api/v1/me/card').then((r) => (r.ok ? setC(r.data.card) : setErr(r.status === 401 ? 'login' : r.message)));
  }, []);
  if (err === 'login') return <div className={s.page}><p className={s.notice}>请先 <Link href="/zh/signin?next=/zh/me/card">登录</Link>，再编辑名片。</p></div>;
  if (err) return <div className={s.page}><p className={s.error}>{err}</p></div>;
  if (!c) return <div className={s.page}><p className={s.small}>加载中…</p></div>;
  async function save() {
    setSaved('');
    const r = await api<{ card: Card }>('/api/v1/me/card', { body: { name: c!.name, company: c!.company ?? '', title: c!.title ?? '', intro: c!.intro ?? '', wechatId: c!.wechatId ?? '', showPhone: !!c!.showPhone, showEmail: !!c!.showEmail, showWechat: !!c!.showWechat } });
    if (r.ok) { setC(r.data.card); setSaved('已保存'); } else setSaved(r.message);
  }
  const link = typeof window !== 'undefined' ? `${location.origin}/zh/card/${c.token}` : '';
  return (
    <div className={s.page}>
      <Link href="/zh/me" className={s.back}>‹ 我的</Link>
      <p className={s.eyebrow}>CARD · 我的名片</p>
      <h1 className={s.h1}>我的名片</h1>
      <CardFace c={c} preview />
      <p className={s.small}>扫名片上的码打开的页面会实时显示当前会员状态。只公开您勾选的联系方式。</p>
      {([['name', '姓名'], ['company', '公司'], ['title', '职位'], ['wechatId', '微信号']] as const).map(([k, l]) => (
        <div className={s.field} key={k}>
          <label className={s.label} htmlFor={`c-${k}`}>{l}</label>
          <input id={`c-${k}`} className={s.input} value={(c[k] as string | null) ?? ''} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
        </div>
      ))}
      <div className={s.field}>
        <label className={s.label} htmlFor="c-intro">业务介绍（一两句）</label>
        <textarea id="c-intro" className={s.textarea} maxLength={200} value={c.intro ?? ''} onChange={(e) => setC({ ...c, intro: e.target.value })} />
      </div>
      <div className={s.field}>
        <span className={s.label}>公开哪些联系方式</span>
        {([['showPhone', `手机 ${c.phone ?? '（未填）'}`], ['showEmail', `邮箱 ${c.email ?? '（未填）'}`], ['showWechat', '微信号']] as const).map(([k, l]) => (
          <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0' }}>
            <input type="checkbox" checked={!!c[k]} onChange={(e) => setC({ ...c, [k]: e.target.checked })} /> {l}
          </label>
        ))}
      </div>
      <div className={s.btnRow}>
        <button className={s.btn} onClick={save}>保存</button>
        <button className={`${s.btn} ${s.btnGhost}`} onClick={async () => { trackWeb('card_share', 'web'); try { await navigator.clipboard.writeText(link); setSaved('名片链接已复制'); } catch { setSaved(link); } }}>复制名片链接</button>
      </div>
      {saved && <p className={saved === '已保存' || saved === '名片链接已复制' ? s.success : s.error} role="status">{saved}</p>}
    </div>
  );
}

export function WebCardPublic({ token }: { token: string }) {
  const [c, setC] = useState<Card | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    trackWeb('card_open', token);
    api<{ card: Card }>(`/api/v1/cards/${encodeURIComponent(token)}`).then((r) => (r.ok ? setC(r.data.card) : setErr(r.message)));
  }, [token]);
  if (err) return <div className={s.page}><p className={s.error}>{err}</p></div>;
  if (!c) return <div className={s.page}><p className={s.small}>加载中…</p></div>;
  return (
    <div className={s.page}>
      <p className={s.eyebrow}>CARD · 电子名片</p>
      <CardFace c={c} />
      <p className={s.small}>会员状态为实时查询结果。</p>
      <div className={s.btnRow}>
        <Link className={s.btn} href="/zh/events#open">看看商会活动</Link>
        <Link className={`${s.btn} ${s.btnGhost}`} href="/zh/about">了解 SAREC</Link>
      </div>
    </div>
  );
}
