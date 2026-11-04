'use client';
/**
 * 联系方式（东哥 2026-11-04）：
 * - 报名表里的手机号、邮箱输入（必填，只检查格式，不发验证码）；
 * - “我的”顶部常驻显示手机和邮箱 + “修改”；退信 / 短信发送失败标红“请更新”；
 * - 距上次确认满 6 个月：问一次“您的联系方式还是这些吗？[没变][去修改]”。
 */
import { useState } from 'react';
import { api } from './client';
import s from './crm.module.css';

export type MethodView = { value: string; masked: string; status: 'unconfirmed' | 'confirmed' | 'invalid'; statusText: string };
export type ContactInfo = {
  email: MethodView | null;
  phone: MethodView | null;
  needsUpdate: boolean;
  needsReconfirm: boolean;
  confirmedAt: string | null;
  phoneVerifyAvailable: boolean;
};

const COUNTRIES = [
  { cc: '+1', label: '+1 美国/加拿大' },
  { cc: '+86', label: '+86 中国大陆' },
  { cc: '+852', label: '+852 香港' },
  { cc: '+886', label: '+886 台湾' }
];

export function splitPhone(e164: string | null | undefined): { cc: string; num: string } {
  if (!e164) return { cc: '+1', num: '' };
  const hit = COUNTRIES.find((c) => e164.startsWith(c.cc) && !(c.cc === '+1' && e164.length !== 12));
  return hit ? { cc: hit.cc, num: e164.slice(hit.cc.length) } : { cc: '', num: e164 };
}

export function joinPhone(cc: string, num: string): string {
  const raw = num.trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  return `${cc}${raw.replace(/\D/g, '')}`;
}

export function PhoneInput({ cc, num, setCc, setNum, label = '手机号' }: { cc: string; num: string; setCc: (v: string) => void; setNum: (v: string) => void; label?: string }) {
  return (
    <div className={s.field}>
      <label className={s.label}>{label}<span className={s.required}>*</span></label>
      <div className={s.inputRow}>
        <select className={s.select} style={{ flex: '0 0 9.5rem' }} value={cc} onChange={(e) => setCc(e.target.value)} aria-label="国家码">
          {COUNTRIES.map((x) => <option key={x.cc} value={x.cc}>{x.label}</option>)}
          {!COUNTRIES.some((x) => x.cc === cc) && <option value={cc}>{cc || '其他'}</option>}
        </select>
        <input className={s.input} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="手机号" value={num} onChange={(e) => setNum(e.target.value)} />
      </div>
    </div>
  );
}

export function EmailInput({ value, setValue, label = '邮箱' }: { value: string; setValue: (v: string) => void; label?: string }) {
  return (
    <div className={s.field}>
      <label className={s.label}>{label}<span className={s.required}>*</span></label>
      <input className={s.input} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

const badge = (m: MethodView) => (
  <span className={`${s.badge} ${m.status === 'confirmed' ? s.badgeGreen : m.status === 'invalid' ? '' : s.badgeMuted}`} style={m.status === 'invalid' ? { color: '#f3c9c9', borderColor: '#e7a1a1' } : undefined}>
    {m.status === 'invalid' ? `${m.statusText}，请更新` : m.statusText}
  </span>
);

/** “我的”顶部：联系方式卡片（含修改、手机验证、6 个月再确认）。 */
export function ContactInfoCard({ info, onChange }: { info: ContactInfo; onChange: (i: ContactInfo) => void }) {
  const [editing, setEditing] = useState(false);
  const p0 = splitPhone(info.phone?.value);
  const [cc, setCc] = useState(p0.cc || '+1');
  const [num, setNum] = useState(p0.num);
  const [email, setEmail] = useState(info.email?.value ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await api<{ contactInfo: ContactInfo; message: string }>('/api/v1/me/contact', { body: { phone: joinPhone(cc, num), email } });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    onChange(r.data.contactInfo);
    setEditing(false);
    setMsg({ ok: true, text: r.data.message });
  }
  async function still() {
    setBusy(true);
    const r = await api<{ contactInfo: ContactInfo; message: string }>('/api/v1/me/contact/still-valid', { method: 'POST' });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    onChange(r.data.contactInfo);
    setMsg({ ok: true, text: r.data.message });
  }
  async function sendCode() {
    setBusy(true);
    const r = await api<{ alreadyVerified: boolean; message: string }>('/api/v1/me/phone/send', { method: 'POST' });
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? r.data.message : r.message });
    if (r.ok && r.data.alreadyVerified) {
      const g = await api<{ contactInfo: ContactInfo }>('/api/v1/me/contact');
      if (g.ok) onChange(g.data.contactInfo);
    } else if (r.ok) setCodeSent(true);
  }
  async function verify() {
    setBusy(true);
    const r = await api<{ message: string }>('/api/v1/me/phone/verify', { body: { code } });
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? r.data.message : r.message });
    if (r.ok) {
      setCodeSent(false);
      const g = await api<{ contactInfo: ContactInfo }>('/api/v1/me/contact');
      if (g.ok) onChange(g.data.contactInfo);
    }
  }

  return (
    <div className={s.card} style={info.needsUpdate ? { borderColor: '#e7a1a1' } : undefined}>
      <p className={s.cardTitle}>我的联系方式</p>
      {info.needsUpdate && !editing && <p className={s.error} style={{ margin: '0 0 0.6rem' }}>活动通知没能送达，请更新联系方式。</p>}
      {info.needsReconfirm && !info.needsUpdate && !editing && (
        <div className={s.notice}>
          您的联系方式还是这些吗？
          <div className={s.btnRow} style={{ marginTop: '0.5rem' }}>
            <button className={`${s.btn} ${s.btnGhost}`} disabled={busy} onClick={still}>没变</button>
            <button className={`${s.btn} ${s.btnQuiet}`} onClick={() => setEditing(true)}>去修改</button>
          </div>
        </div>
      )}
      {!editing ? (
        <>
          <div className={s.row}><span className={s.rowLabel}>手机</span><span className={s.rowValue}>{info.phone ? <>{info.phone.masked} {badge(info.phone)}</> : '未填写'}</span></div>
          <div className={s.row}><span className={s.rowLabel}>邮箱</span><span className={s.rowValue}>{info.email ? <>{info.email.masked} {badge(info.email)}</> : '未填写'}</span></div>
          {info.phone && info.phone.status === 'unconfirmed' && info.phoneVerifyAvailable && (
            codeSent ? (
              <div className={s.inputRow} style={{ marginTop: '0.6rem' }}>
                <input className={`${s.input} ${s.mono}`} inputMode="numeric" maxLength={8} placeholder="短信验证码" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                <button className={`${s.btn} ${s.btnGhost}`} style={{ flex: '0 0 7rem' }} disabled={busy} onClick={verify}>验证</button>
              </div>
            ) : (
              <button className={`${s.btn} ${s.btnQuiet}`} style={{ marginTop: '0.6rem' }} disabled={busy} onClick={sendCode}>验证手机号</button>
            )
          )}
          <button className={`${s.btn} ${info.needsUpdate ? '' : s.btnGhost}`} style={{ marginTop: '0.6rem' }} onClick={() => setEditing(true)}>{info.needsUpdate ? '请更新' : '修改'}</button>
        </>
      ) : (
        <form onSubmit={save}>
          <PhoneInput cc={cc} num={num} setCc={setCc} setNum={setNum} />
          <EmailInput value={email} setValue={setEmail} />
          <p className={s.small}>修改后需要重新验证：新邮箱会收到确认邮件，新手机号需要短信验证。</p>
          <div className={s.btnRow}>
            <button className={s.btn} disabled={busy}>{busy ? '保存中…' : '保存'}</button>
            <button type="button" className={`${s.btn} ${s.btnQuiet}`} onClick={() => setEditing(false)}>取消</button>
          </div>
        </form>
      )}
      {msg && <p className={msg.ok ? s.small : s.error} role={msg.ok ? undefined : 'alert'} style={{ marginTop: '0.5rem' }}>{msg.text}</p>}
    </div>
  );
}
