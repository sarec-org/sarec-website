'use client';
/**
 * 工作人员页面外壳：未登录 → 邮箱验证码登录（同一页完成）；无权限 → 大白话说明；有权限 → 渲染页面。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api } from '@/components/crm/client';

export type StaffInfo = { name: string; email: string; roles: string[] };
export const can = (s: StaffInfo, role: string) => s.roles.includes('admin') || s.roles.includes(role);

export function StaffGate({
  role,
  title,
  wide,
  children
}: {
  role?: string | string[];
  title: string;
  wide?: boolean;
  children: (s: StaffInfo) => ReactNode;
}) {
  const [state, setState] = useState<'loading' | 'login' | 'forbidden' | 'ok'>('loading');
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await api<{ staff: StaffInfo }>('/api/v1/staff/me');
    if (r.ok) {
      setStaff(r.data.staff);
      setState('ok');
    } else if (r.status === 401) setState('login');
    else {
      setMsg(r.message);
      setState('forbidden');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const roles = role ? (Array.isArray(role) ? role : [role]) : [];
  const allowed = staff && (roles.length === 0 || roles.some((r) => can(staff, r)));

  return (
    <div className={`${styles.page} ${wide ? styles.pageWide : ''}`}>
      <Link href="/zh/staff" className={styles.back}>
        ‹ 返回后台首页
      </Link>
      <h1 className={styles.h1}>{title}</h1>
      {state === 'loading' && <p className={styles.muted}>正在加载…</p>}
      {state === 'login' && <StaffLogin onDone={load} />}
      {state === 'forbidden' && <div className={styles.error}>{msg || '这个账号还没有开通工作人员权限，请联系管理员'}</div>}
      {state === 'ok' && staff && !allowed && <div className={styles.error}>您没有这个页面的权限，请联系管理员开通。</div>}
      {state === 'ok' && staff && allowed && children(staff)}
    </div>
  );
}

function StaffLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('');

  async function send() {
    setBusy(true);
    setErr('');
    const r = await api<{ devCode?: string }>('/api/v1/auth/code/send', { body: { channel: 'email', target: email } });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setSent(true);
    setHint(r.data.devCode ? `测试环境验证码：${r.data.devCode}` : '验证码已发到邮箱，10 分钟内有效');
  }
  async function verify() {
    setBusy(true);
    setErr('');
    const r = await api('/api/v1/auth/code/verify', { body: { channel: 'email', target: email, code } });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onDone();
  }
  return (
    <div className={styles.card}>
      <p className={styles.lead}>请用工作人员邮箱登录（收验证码，不需要密码）。</p>
      {err && <div className={styles.error}>{err}</div>}
      {hint && <div className={styles.notice}>{hint}</div>}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="staff-email">邮箱</label>
        <input id="staff-email" className={styles.input} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {sent && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="staff-code">验证码</label>
          <input id="staff-code" className={styles.input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      )}
      <div className={styles.btnRow}>
        {!sent ? (
          <button className={styles.btn} disabled={busy || !email} onClick={send}>
            {busy ? '处理中…' : '获取验证码'}
          </button>
        ) : (
          <>
            <button className={styles.btn} disabled={busy || code.length < 6} onClick={verify}>
              {busy ? '处理中…' : '登录'}
            </button>
            <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy} onClick={send}>
              重新发送
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return <div className={m.ok ? styles.success : styles.error}>{m.text}</div>;
}
