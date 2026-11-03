'use client';
/**
 * 现场签到 /zh/checkin/[slug]?k=...
 * 已登录：打开即签到，大字显示结果。未登录：最少登记三项（姓名、联系方式、主要角色）后签到。
 * 入场判断全部由服务端 checkIn() 决定（收费未核款不显示签到成功；满员/取消/扫错场次显示实际状态）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, money } from './client';
import { ContactCodeFields, useContactInput, useMeta, verifyCode } from './LoginBox';
import { ProfileFlow } from './ProfileFlow';
import { RolePicker } from './Questions';
import s from './crm.module.css';

type Result =
  | { kind: 'checked_in' | 'already' | 'waitlisted' | 'rejected' | 'need_profile'; message: string }
  | { kind: 'pending_payment'; message: string; orderNo: string; amountCents: number };

const ICON: Record<string, string> = { checked_in: '✓', already: '✓', pending_payment: '…', waitlisted: '!', rejected: '×', need_profile: '✎' };

export function Checkin({ slug, k }: { slug: string; k: string }) {
  const meta = useMeta();
  const [phase, setPhase] = useState<'checking' | 'login' | 'profile' | 'result'>('checking');
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [roleOther, setRoleOther] = useState('');
  const c = useContactInput();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const doCheckin = useCallback(async (extra: { name?: string; roleSub?: string } = {}) => {
    setErr(null);
    const r = await api<{ result: Result }>(`/api/v1/events/${encodeURIComponent(slug)}/checkin`, { body: { k, ...extra } });
    if (!r.ok) {
      if (r.status === 401) return setPhase('login');
      setErr(r.message);
      return setPhase('result');
    }
    if (r.data.result.kind === 'need_profile') return setPhase('profile');
    setResult(r.data.result);
    setPhase('result');
  }, [slug, k]);

  useEffect(() => {
    doCheckin();
  }, [doCheckin]);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    if (phase === 'login') {
      const v = await verifyCode(c, code, name);
      if (!v.ok) {
        setBusy(false);
        return setErr(v.message);
      }
    }
    await doCheckin({ name, roleSub: role });
    setBusy(false);
  }

  if (phase === 'checking') return <div className={s.page}><div className={s.bigResult}><p className={s.bigText}>正在签到…</p></div></div>;

  if (phase === 'login' || phase === 'profile') {
    const ready = !!name.trim() && !!role && (phase === 'profile' || code.length === 6);
    return (
      <div className={s.page}>
        <p className={s.eyebrow}>CHECK-IN · 现场签到</p>
        <h1 className={s.h1}>{phase === 'login' ? '第一次来？10 秒登记' : '请补充姓名和行业'}</h1>
        <p className={s.muted}>登记完成即签到。以后来活动扫码直接进。</p>
        <form onSubmit={submitNew}>
          <div className={s.field}>
            <label className={s.label}>怎么称呼您？<span className={s.required}>*</span></label>
            <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="中文或英文名都可以" />
          </div>
          {phase === 'login' && <ContactCodeFields c={c} code={code} setCode={setCode} smsAvailable={!!meta?.smsAvailable} />}
          <div className={s.field}>
            <label className={s.label}>主要行业<span className={s.required}>*</span></label>
            <RolePicker meta={meta} value={role} onChange={setRole} other={roleOther} setOther={setRoleOther} />
          </div>
          {err && <p className={s.error} role="alert">{err}</p>}
          <div className={s.bottomBar}><div className={s.bottomInner}><button className={s.btn} disabled={busy || !ready}>{busy ? '处理中…' : '签到'}</button></div></div>
        </form>
        <p className={s.small}>不会操作？请找门口工作人员帮您签到。</p>
      </div>
    );
  }

  const kind = result?.kind ?? 'rejected';
  const good = kind === 'checked_in' || kind === 'already';
  return (
    <div className={s.page}>
      <div className={s.bigResult} role="status" aria-live="assertive">
        <div className={s.bigIcon} style={{ color: good ? 'var(--signal-green)' : kind === 'pending_payment' ? 'var(--gold)' : '#e7a1a1' }}>{err ? '×' : ICON[kind]}</div>
        <p className={s.bigText}>{err ? '没有签到成功' : good ? '签到成功' : kind === 'pending_payment' ? '待付款 / 待核款' : kind === 'waitlisted' ? '名额已满' : '无法签到'}</p>
        <p className={s.lead}>{err ?? result?.message}</p>
      </div>
      {result?.kind === 'pending_payment' && (
        <Link className={`${s.btn} ${s.btnBlock}`} href={`/zh/pay/${result.orderNo}`}>去付款 {money(result.amountCents)}</Link>
      )}
      {err && <button className={`${s.btn} ${s.btnBlock}`} onClick={() => { setPhase('checking'); doCheckin(); }}>再试一次</button>}
      {good && (
        <>
          <h2 className={s.h2}>继续完善资料（可跳过）</h2>
          <ProfileFlow eventSlug={slug} doneHref="/zh/me" doneLabel="完成" />
        </>
      )}
    </div>
  );
}
