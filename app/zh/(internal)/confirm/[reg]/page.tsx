'use client';
/** 1.3.1 B：短信里的“确认出席”链接。打开只显示活动和两个按钮，点了才算（防止消息预览误触自动确认）。不需要登录。 */
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';

type Info = { state: string; title: string; startsAt: string; timezone: string; place: string | null; offerExpiresAt: string | null; name: string | null };
const when = (d: string, tz: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: tz || 'America/Los_Angeles', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));

export default function Confirm({ params, searchParams }: { params: { reg: string }; searchParams: { t?: string } }) {
  const t = searchParams.t ?? '';
  const [info, setInfo] = useState<Info | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/v1/confirm/${encodeURIComponent(params.reg)}?t=${encodeURIComponent(t)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => (j.ok ? setInfo(j.info) : setErr(j.error?.message ?? '链接已失效')))
      .catch(() => setErr('网络不太好，请刷新页面再试一次'));
  }, [params.reg, t]);
  async function answer(a: 'yes' | 'no') {
    setBusy(true);
    const j = await fetch(`/api/v1/confirm/${encodeURIComponent(params.reg)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, answer: a }) }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (j?.ok) { setMsg(j.result.message); setInfo(j.info); } else setErr(j?.error?.message ?? '网络不太好，请再点一次');
  }
  const ask = info && (info.state === 'ask' || info.state === 'offer');
  return (
    <main className={styles.page} style={{ maxWidth: 520 }}>
      <h1 className={styles.h1}>{info?.state === 'offer' ? '有名额了' : '确认出席'}</h1>
      {!info && !err && <p className={styles.muted}>正在打开…</p>}
      {err && <p className={styles.error}>{err}</p>}
      {info && (
        <div className={styles.card}>
          <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>{info.title}</p>
          <p className={styles.small} style={{ margin: 0 }}>{when(info.startsAt, info.timezone)}（当地时间）{info.place ? ` · ${info.place}` : ''}</p>
          {info.state === 'offer' && info.offerExpiresAt && <p className={styles.small}>请在 {when(info.offerExpiresAt, info.timezone)} 前确认，逾期名额会给下一位。</p>}
        </div>
      )}
      {msg && <p className={styles.success} style={{ fontSize: 18 }}>{msg}</p>}
      {ask && !msg && (
        <div className={styles.btnRow}>
          <button className={styles.btn} style={{ fontSize: 18, minHeight: 52 }} disabled={busy} onClick={() => answer('yes')}>我来</button>
          <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ fontSize: 18, minHeight: 52 }} disabled={busy} onClick={() => answer('no')}>去不了</button>
        </div>
      )}
      {info && !ask && !msg && (
        <p className={styles.success} style={{ fontSize: 18 }}>
          {info.state === 'confirmed' ? '您已确认出席，到时见！' : info.state === 'waitlist' ? '您在候补名单里，有空位会通知您。' : info.state === 'checked_in' ? '您已签到，祝您愉快' : info.state === 'cancelled' ? '这份报名已经取消了。' : '活动已结束或已取消。'}
        </p>
      )}
    </main>
  );
}
