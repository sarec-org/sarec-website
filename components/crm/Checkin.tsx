'use client';
/**
 * 现场签到 /zh/checkin/[slug]?k=...（1.3 零指导）
 * - 已登录：打开即签到，大字显示“XX，欢迎！已签到”，不需要再点任何按钮。
 * - 未登录（多半是用微信或手机相机扫到了网页签到码，网页认不出微信身份）：
 *   只填姓名、手机两项 → 按手机号找到已有报名直接签到；没有报名就现场报名并签到。不收验证码。
 * - 已签到又扫：“您已签到，祝您愉快”。
 * - 网络慢：先显示“正在签到…”；失败写清原因，给“再试一次”。
 * - 签到成功页不塞问卷；“补充资料”放在最下面，可以不管。
 * 入场判断全部由服务端 checkIn() 决定（收费未核款不显示签到成功；满员 / 取消 / 扫错场次显示实际状态）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, money } from './client';
import s from './crm.module.css';

type Result =
  | { kind: 'checked_in' | 'already' | 'waitlisted' | 'rejected' | 'need_profile'; message: string; greetName?: string | null }
  | { kind: 'pending_payment'; message: string; orderNo?: string; amountCents?: number };

const NET_ERR = '网络不太好，签到还没成功。请再点一次“再试一次”；还不行就找门口工作人员。';

export function Checkin({ slug, k }: { slug: string; k: string }) {
  const [phase, setPhase] = useState<'checking' | 'guest' | 'result'>('checking');
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cc, setCc] = useState<'+1' | '+86'>('+1');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const lastTry = useRef<'auto' | 'guest'>('auto');

  const show = (r: { ok: boolean; status?: number; message?: string; data?: { result: Result } }) => {
    if (!r.ok) {
      // 签到码不对 / 活动不存在：照实写；其他（断网、超时、服务器出错）：写清下一步
      setErr(r.status && r.status < 500 && r.status !== 401 ? r.message ?? NET_ERR : NET_ERR);
      setPhase('result');
      return;
    }
    setErr(null);
    setResult(r.data!.result);
    setPhase('result');
  };

  const autoCheckin = useCallback(async () => {
    lastTry.current = 'auto';
    setErr(null);
    setPhase('checking');
    const r = await api<{ result: Result }>(`/api/v1/events/${encodeURIComponent(slug)}/checkin`, { body: { k, v: 3 } });
    if (!r.ok && r.status === 401) return setPhase('guest');
    if (r.ok && r.data.result.kind === 'need_profile') return setPhase('guest');
    show(r);
  }, [slug, k]);

  useEffect(() => {
    autoCheckin();
  }, [autoCheckin]);

  async function submitGuest(e: React.FormEvent) {
    e.preventDefault();
    if (busy || inFlight.current) return;
    if (!name.trim()) return setErr('请填写您的姓名');
    if (!phone.trim()) return setErr('请填写手机号');
    inFlight.current = true;
    lastTry.current = 'guest';
    setBusy(true);
    setErr(null);
    const r = await api<{ result: Result }>(`/api/v1/events/${encodeURIComponent(slug)}/checkin-guest`, { body: { k, name: name.trim(), phone: phone.trim(), cc } });
    setBusy(false);
    inFlight.current = false;
    // 手机号格式不对：留在表单上，告诉对方哪里要改
    if (!r.ok && r.status === 400) return setErr(r.message);
    show(r);
  }

  if (phase === 'checking') {
    return (
      <div className={s.page}>
        <div className={s.bigResult} role="status" aria-live="polite">
          <p className={s.bigText}>正在签到…</p>
          <p className={s.lead}>请稍等几秒，不用点任何按钮。</p>
        </div>
      </div>
    );
  }

  if (phase === 'guest') {
    return (
      <div className={s.page}>
        <h1 className={s.h1} style={{ fontSize: '1.9rem' }}>填两项，马上签到</h1>
        <p className={s.lead}>已经报过名的，填报名时的手机号就行；没报名的，填完直接报名并签到。</p>
        <form onSubmit={submitGuest}>
          <div className={s.field}>
            <label className={s.label} htmlFor="ci-name" style={{ fontSize: '1.15rem' }}>您的姓名</label>
            <input id="ci-name" className={s.input} style={{ fontSize: '1.25rem', minHeight: 58 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="中文或英文都可以" autoComplete="name" />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="ci-phone" style={{ fontSize: '1.15rem' }}>手机号</label>
            <div className={s.inputRow}>
              <select className={s.select} style={{ fontSize: '1.15rem', minHeight: 58 }} value={cc} onChange={(e) => setCc(e.target.value as '+1' | '+86')} aria-label="国家或地区">
                <option value="+1">美国 +1</option>
                <option value="+86">中国 +86</option>
              </select>
              <input id="ci-phone" className={s.input} style={{ fontSize: '1.25rem', minHeight: 58 }} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号" autoComplete="tel-national" />
            </div>
          </div>
          {err && <p className={s.error} role="alert" style={{ fontSize: '1.1rem' }}>{err}</p>}
          <button className={`${s.btn} ${s.btnBlock}`} style={{ fontSize: '1.3rem', minHeight: 64, marginTop: 8 }} disabled={busy}>{busy ? '正在签到…' : '签到'}</button>
        </form>
        <p className={s.small} style={{ marginTop: 24 }}>也可以打开微信「扫一扫」扫门口的签到码，会直接认出您。</p>
      </div>
    );
  }

  const kind = result?.kind ?? 'rejected';
  const good = !err && (kind === 'checked_in' || kind === 'already');
  const title = err
    ? '还没签到成功'
    : kind === 'checked_in'
      ? (result?.message ?? '欢迎！已签到')
      : kind === 'already'
        ? '您已签到'
        : kind === 'pending_payment'
          ? '请找门口工作人员'
          : kind === 'waitlisted'
            ? '名额已满，您在候补名单'
            : '没能签到';
  const sub = err ?? (kind === 'checked_in' ? '里面请，祝您愉快。' : result?.message);
  return (
    <div className={s.page}>
      <div className={s.bigResult} role="status" aria-live="assertive" style={good ? { background: 'rgba(76, 175, 110, 0.12)', borderRadius: 16 } : undefined}>
        <div className={s.bigIcon} style={{ color: good ? 'var(--signal-green)' : kind === 'pending_payment' ? 'var(--gold)' : '#e7a1a1', fontSize: '5rem' }}>{good ? '✓' : err ? '!' : kind === 'pending_payment' ? '…' : '!'}</div>
        <p className={s.bigText} style={good ? { color: 'var(--signal-green)' } : undefined}>{title}</p>
        <p className={s.lead} style={{ fontSize: '1.2rem' }}>{sub}</p>
      </div>
      {err && (
        <button className={`${s.btn} ${s.btnBlock}`} style={{ fontSize: '1.3rem', minHeight: 64 }} onClick={() => (lastTry.current === 'guest' ? setPhase('guest') : autoCheckin())}>
          再试一次
        </button>
      )}
      {!err && result?.kind === 'pending_payment' && result.orderNo && (
        <Link className={`${s.btn} ${s.btnBlock}`} href={`/zh/pay/${result.orderNo}`}>
          去付款{result.amountCents ? ` ${money(result.amountCents)}` : ''}
        </Link>
      )}
      {good && (
        <p className={s.small} style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/zh/me">补充资料、看我的报名（可以不管）</Link>
        </p>
      )}
    </div>
  );
}
