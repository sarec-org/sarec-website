'use client';
/** 邮件通讯一键退订：打开页面即退订（立即生效），可以重新订阅。不需要登录。 */
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';

export default function Unsubscribe({ searchParams }: { searchParams: { t?: string } }) {
  const t = searchParams.t ?? '';
  const [state, setState] = useState<'working' | 'done' | 'error' | 'back'>('working');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!t) { setState('error'); setMsg('退订链接不完整。请直接回复那封邮件，我们会马上为您退订。'); return; }
    fetch('/api/v1/newsletter/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t }) })
      .then((r) => r.json())
      .then((j) => { if (j.ok) { setState('done'); setEmail(j.email ?? ''); } else { setState('error'); setMsg(j.error?.message ?? '没有退订成功，请稍后再试'); } })
      .catch(() => { setState('error'); setMsg('网络不太好，请刷新页面再试一次'); });
  }, [t]);
  async function back() {
    const r = await fetch('/api/v1/newsletter/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, action: 'resubscribe' }) }).then((x) => x.json()).catch(() => null);
    if (r?.ok) setState('back');
  }
  return (
    <main className={styles.page}>
      <h1 className={styles.h1}>邮件通讯退订</h1>
      {state === 'working' && <p className={styles.muted}>正在为您退订…</p>}
      {state === 'done' && (
        <>
          <p className={styles.success}>已退订{email ? `（${email}）` : ''}，立即生效。以后不会再收到商会的邮件通讯。</p>
          <p className={styles.small}>活动报名确认、提醒这类和您本人报名有关的邮件不受影响。</p>
          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={back}>点错了，重新订阅</button>
        </>
      )}
      {state === 'back' && <p className={styles.success}>已重新订阅，谢谢！</p>}
      {state === 'error' && <p className={styles.error}>{msg}</p>}
    </main>
  );
}
