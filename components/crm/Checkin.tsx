'use client';
/**
 * 现场签到 /zh/checkin/[slug]?k=...
 * 已登录：打开即签到，大字显示结果。
 * 未登录（多半是用微信扫一扫打开了网页，网页认不出微信身份）：先提示改用微信扫签到小程序码；
 * 扫不了时用报名时的手机号 / 邮箱验证码找到已有报名再签到，不直接当新人建档；
 * 验证后才发现是第一次来（没有姓名 / 行业），才补填这两项、现场报名并签到。
 * 入场判断全部由服务端 checkIn() 决定（收费未核款不显示签到成功；满员/取消/扫错场次显示实际状态）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  // 连点保护：state 还没更新时第二次点击也要挡住
  const inFlight = useRef(false);

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

  // 未登录：只验证手机号 / 邮箱，先按已有报名签到；是新人才进入补填姓名和行业
  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const v = await verifyCode(c, code);
    if (!v.ok) {
      setBusy(false);
      inFlight.current = false;
      return setErr(v.message);
    }
    await doCheckin();
    setBusy(false);
    inFlight.current = false;
  }
  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    await doCheckin({ name, roleSub: role });
    setBusy(false);
    inFlight.current = false;
  }

  if (phase === 'checking') return <div className={s.page}><div className={s.bigResult}><p className={s.bigText}>正在签到…</p></div></div>;

  if (phase === 'login') {
    return (
      <div className={s.page}>
        <p className={s.eyebrow}>CHECK-IN · 现场签到</p>
        <h1 className={s.h1}>请用微信扫码签到</h1>
        <p className={s.muted}>请打开微信「扫一扫」，扫门口的签到码。会直接打开商会小程序，认出您的报名后立即签到，不用填资料。</p>
        <h2 className={s.h2}>已报名，但扫不了？</h2>
        <p className={s.small}>用报名时填的手机号或邮箱收验证码，找到您的报名后签到。</p>
        <form onSubmit={submitLogin}>
          <ContactCodeFields c={c} code={code} setCode={setCode} smsAvailable={!!meta?.smsAvailable} />
          {err && <p className={s.error} role="alert">{err}</p>}
          <div className={s.bottomBar}><div className={s.bottomInner}><button className={s.btn} disabled={busy || code.length !== 6}>{busy ? '处理中…' : '找到我的报名并签到'}</button></div></div>
        </form>
        <p className={s.small}>不会操作？请找门口工作人员帮您签到。</p>
      </div>
    );
  }

  if (phase === 'profile') {
    const ready = !!name.trim() && !!role;
    return (
      <div className={s.page}>
        <p className={s.eyebrow}>CHECK-IN · 现场签到</p>
        <h1 className={s.h1}>第一次来，请补充姓名和行业</h1>
        <p className={s.muted}>没有找到您的报名记录。填好后现场报名并签到。</p>
        <form onSubmit={submitProfile}>
          <div className={s.field}>
            <label className={s.label}>怎么称呼您？<span className={s.required}>*</span></label>
            <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="中文或英文名都可以" />
          </div>
          <div className={s.field}>
            <label className={s.label}>主要行业<span className={s.required}>*</span></label>
            <RolePicker meta={meta} value={role} onChange={setRole} other={roleOther} setOther={setRoleOther} />
          </div>
          {err && <p className={s.error} role="alert">{err}</p>}
          <div className={s.bottomBar}><div className={s.bottomInner}><button className={s.btn} disabled={busy || !ready}>{busy ? '处理中…' : '报名并签到'}</button></div></div>
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
