'use client';
/** 邮件里点“确认邮箱”打开这页：自动提交确认（邮件安全扫描只打开链接、不执行脚本，不会误确认）。 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api } from './client';
import s from './crm.module.css';

export function ConfirmEmail({ token }: { token: string }) {
  const [r, setR] = useState<{ ok: boolean; message: string } | null>(null);
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    api<{ ok: boolean; message: string }>('/api/v1/contact/confirm-email', { body: { t: token } }).then((x) =>
      setR(x.ok ? { ok: x.data.ok, message: x.data.message } : { ok: false, message: x.message })
    );
  }, [token]);
  return (
    <div className={s.page}>
      <p className={s.eyebrow}>EMAIL · 确认邮箱</p>
      <h1 className={s.h1}>{!r ? '正在确认…' : r.ok ? '邮箱已确认' : '没能确认'}</h1>
      {r && <p className={r.ok ? s.notice : s.error}>{r.message}</p>}
      <Link className={s.btn} href="/zh/events">看看近期活动</Link>
    </div>
  );
}
