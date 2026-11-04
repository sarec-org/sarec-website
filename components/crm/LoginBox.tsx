'use client';
/**
 * 登录（不设密码）：邮箱验证码为主；短信未配置时提示用邮箱；也可用小程序扫码登录。
 * 可嵌在报名页里（embedded），与姓名、角色放在同一屏。
 */
import { useEffect, useRef, useState } from 'react';
import { api } from './client';
import s from './crm.module.css';

export type Identity = { channel: 'email' | 'sms'; target: string };

const COUNTRIES = [
  { cc: '+1', label: '+1 美国/加拿大' },
  { cc: '+86', label: '+86 中国大陆' },
  { cc: '+852', label: '+852 香港' },
  { cc: '+886', label: '+886 台湾' }
];

export function useContactInput(initialEmail = '') {
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [cc, setCc] = useState('+1');
  const [phone, setPhone] = useState('');
  const target = channel === 'email' ? email.trim() : `${cc}${phone.replace(/\D/g, '')}`;
  return { channel, setChannel, email, setEmail, cc, setCc, phone, setPhone, target };
}

/** 联系方式 + 验证码两行；verify() 由外层在提交时调用。 */
export function ContactCodeFields({
  c,
  code,
  setCode,
  smsAvailable
}: {
  c: ReturnType<typeof useContactInput>;
  code: string;
  setCode: (v: string) => void;
  smsAvailable: boolean;
}) {
  const [sending, setSending] = useState(false);
  const [left, setLeft] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => clearInterval(timer.current), []);

  async function send() {
    if (sending || left > 0) return;
    setSending(true);
    setMsg(null);
    const r = await api<{ target: string; devCode?: string }>('/api/v1/auth/code/send', { body: { channel: c.channel, target: c.target } });
    setSending(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.message });
      return;
    }
    if (r.data.devCode) setCode(r.data.devCode); // 仅测试环境
    setMsg({ ok: true, text: c.channel === 'email' ? '验证码已发到邮箱，10 分钟内有效（没收到请看垃圾邮件）' : '验证码已发到手机，10 分钟内有效' });
    setLeft(60);
    clearInterval(timer.current);
    timer.current = setInterval(() => setLeft((x) => (x <= 1 ? (clearInterval(timer.current), 0) : x - 1)), 1000);
  }

  return (
    <>
      <div className={s.btnRow} role="tablist" aria-label="验证方式" style={{ marginBottom: '0.75rem' }}>
        {(['email', 'sms'] as const).map((ch) => (
          <button
            key={ch}
            type="button"
            role="tab"
            aria-selected={c.channel === ch}
            className={`${s.btn} ${c.channel === ch ? '' : s.btnQuiet}`}
            style={{ flex: 1 }}
            onClick={() => { c.setChannel(ch); setMsg(null); }}
          >
            {ch === 'email' ? '邮箱验证' : '手机号验证'}
          </button>
        ))}
      </div>
      <div className={s.field}>
        <label className={s.label}>
          {c.channel === 'email' ? '邮箱' : '手机号'}
          <span className={s.required}>*</span>
        </label>
        {c.channel === 'email' ? (
          <input className={s.input} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={c.email} onChange={(e) => c.setEmail(e.target.value)} />
        ) : (
          <>
            {!smsAvailable && <p className={s.small}>短信暂时发不出，请改用邮箱验证。</p>}
            <div className={s.inputRow}>
              <select className={s.select} style={{ flex: '0 0 9.5rem' }} value={c.cc} onChange={(e) => c.setCc(e.target.value)} aria-label="国家码">
                {COUNTRIES.map((x) => (
                  <option key={x.cc} value={x.cc}>
                    {x.label}
                  </option>
                ))}
              </select>
              <input className={s.input} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="手机号" value={c.phone} onChange={(e) => c.setPhone(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <div className={s.field}>
        <label className={s.label}>
          验证码<span className={s.required}>*</span>
        </label>
        <div className={s.inputRow}>
          <input
            className={`${s.input} ${s.mono}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6 位数字"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button type="button" className={`${s.btn} ${s.btnGhost}`} style={{ flex: '0 0 8.5rem' }} onClick={send} disabled={sending || left > 0}>
            {sending ? '发送中…' : left > 0 ? `${left} 秒后重发` : '获取验证码'}
          </button>
        </div>
        {msg && <p className={msg.ok ? s.small : s.error} role={msg.ok ? undefined : 'alert'}>{msg.text}</p>}
        {msg && !msg.ok && c.channel === 'sms' && (
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => { c.setChannel('email'); setMsg(null); }}>改用邮箱验证</button>
        )}
      </div>
    </>
  );
}

export async function verifyCode(c: ReturnType<typeof useContactInput>, code: string, name?: string) {
  return api<{ contactId: string; created: boolean }>('/api/v1/auth/code/verify', {
    body: { channel: c.channel, target: c.target, code, name }
  });
}

export function useMeta() {
  const [meta, setMeta] = useState<{
    roleCategories: { key: string; label: string; subs: { key: string; label: string }[] }[];
    quickRoles: { key: string; label: string }[];
    smsAvailable: boolean;
  } | null>(null);
  useEffect(() => {
    api<NonNullable<typeof meta>>('/api/v1/meta').then((r) => r.ok && setMeta(r.data));
  }, []);
  return meta;
}

/** 独立登录框：邮箱验证码 + 小程序扫码登录 */
export function LoginBox({ onDone, initialEmail = '' }: { onDone: () => void; initialEmail?: string }) {
  const c = useContactInput(initialEmail);
  const meta = useMeta();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const r = await verifyCode(c, code);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onDone();
  }

  return (
    <form onSubmit={submit}>
      <ContactCodeFields c={c} code={code} setCode={setCode} smsAvailable={!!meta?.smsAvailable} />
      {err && <p className={s.error} role="alert">{err}</p>}
      <button className={`${s.btn} ${s.btnBlock}`} disabled={busy || code.length !== 6}>
        {busy ? '处理中…' : '登录'}
      </button>
      <p className={s.small} style={{ marginTop: '0.75rem' }}>不需要密码。第一次使用会自动建立您的档案。</p>
      <QrLogin onDone={onDone} />
    </form>
  );
}

/** 网站扫码登录：显示二维码，用 SAREC 小程序“扫码”确认即登录。 */
function QrLogin({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'waiting' | 'expired'>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function start() {
    setOpen(true);
    setState('waiting');
    const r = await api<{ code: string; poll: string; scanText: string }>('/api/v1/auth/qr', { method: 'POST' });
    if (!r.ok) return setState('expired');
    try {
      const QR = await import('qrcode');
      setImg(await QR.toDataURL(r.data.scanText, { width: 240, margin: 1 }));
    } catch {
      setImg(null);
    }
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const p = await api<{ status: string }>(`/api/v1/auth/qr?poll=${encodeURIComponent(r.data.poll)}`);
      if (!p.ok) return;
      if (p.data.status === 'approved') {
        clearInterval(pollRef.current);
        onDone();
      } else if (p.data.status === 'expired') {
        clearInterval(pollRef.current);
        setState('expired');
      }
    }, 2000);
  }

  if (!open) {
    return (
      <button type="button" className={`${s.btn} ${s.btnQuiet} ${s.btnBlock}`} style={{ marginTop: '1rem' }} onClick={start}>
        用 SAREC 小程序扫码登录
      </button>
    );
  }
  return (
    <div className={s.card} style={{ marginTop: '1rem', textAlign: 'center' }}>
      {state === 'expired' ? (
        <>
          <p>二维码已过期。</p>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={start}>
            刷新二维码
          </button>
        </>
      ) : (
        <>
          {img ? <img src={img} alt="扫码登录二维码" className={s.qrImg} /> : <p className={s.small}>二维码生成中…</p>}
          <p className={s.small}>打开 SAREC 小程序 → 首页右上角“扫码” → 扫这个二维码，确认后本页自动登录。</p>
        </>
      )}
    </div>
  );
}
