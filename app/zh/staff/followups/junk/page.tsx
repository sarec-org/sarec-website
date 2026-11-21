'use client';
/**
 * 推销 / 垃圾每日汇总邮件里的"全部不跟进"（后台综合优化 四.3）。
 * 地址带 ?b=<这一批>&t=<口令>：已登录的工作人员打开就自动执行（只动那封邮件列出的几条），执行一次后把口令从地址栏去掉。
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

function Run() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const sp = new URLSearchParams(location.search);
    const b = sp.get('b');
    const t = sp.get('t');
    if (!b || !t) return setMsg({ ok: false, text: '这个链接不完整。请到「待跟进」里处理推销和垃圾。' });
    history.replaceState(null, '', location.pathname);
    api<{ message: string }>('/api/v1/staff/followups/junk', { body: { batch: b, token: t } }).then((r) => setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message }));
  }, []);
  return (
    <>
      {msg ? <Msg m={msg} /> : <p className={styles.muted}>正在处理…</p>}
      <div className={styles.btnRow} style={{ marginTop: '1rem' }}>
        <Link className={styles.btn} href="/zh/staff">回到今天</Link>
        <Link className={`${styles.btn} ${styles.btnGhost}`} href="/zh/staff/followups?cat=junk&status=">看推销和垃圾</Link>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="推销和垃圾：全部不跟进">
      {() => <Run />}
    </StaffGate>
  );
}
