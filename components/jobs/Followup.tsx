'use client';
/** /zh/jobs/followup/[token]：第 7 天回访，一键回答（联系上了吗、成了吗、满意吗）。不用登录；结果只进后台，不公开 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { Disclaimer } from './shared';

type F = { title: string; side: 'poster' | 'pro'; answered: boolean; questions: { key: 'reached' | 'deal' | 'satisfied'; text: string }[] };
type A = { reached: boolean | null; deal: boolean | null; satisfied: boolean | null };

export function Followup({ token }: { token: string }) {
  const [f, setF] = useState<F | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [a, setA] = useState<A>({ reached: null, deal: null, satisfied: null });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    api<{ followup: F }>(`/api/v1/jobs/followup/${encodeURIComponent(token)}`).then((r) => (r.ok ? setF(r.data.followup) : setErr(r.message)));
  }, [token]);

  async function pick(next: A) {
    setA(next);
    // 没联系上：后两题不用答；联系上了：三题都答完就提交
    const finished = next.reached === false || (next.reached === true && next.deal !== null && next.satisfied !== null);
    if (!finished) return;
    setBusy(true);
    const r = await api(`/api/v1/jobs/followup/${encodeURIComponent(token)}`, { body: next });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setDone(true);
  }

  const q = (k: 'reached' | 'deal' | 'satisfied') => f?.questions.find((x) => x.key === k)?.text ?? '';
  const yesNo = (k: keyof A, yes: string, no: string) => (
    <div className={j.opts}>
      {([[true, yes], [false, no]] as const).map(([v, l]) => (
        <button key={l} type="button" disabled={busy} className={`${j.opt} ${a[k] === v ? j.optOn : ''}`} onClick={() => pick({ ...a, [k]: v })}>{l}</button>
      ))}
    </div>
  );

  return (
    <div className={`${s.page} ${j.work}`}>
      <p className={s.eyebrow}>找工人 · 接活儿</p>
      <h1 className={s.h1}>问你三个小问题</h1>
      {err && <div className={s.error}>{err}</div>}
      {err && <Link href="/zh/jobs" className={`${s.btn} ${s.btnBlock}`}>回找工人 · 接活儿</Link>}
      {!f && !err && <p className={s.muted}>正在加载…</p>}
      {f && (done || f.answered) && (
        <>
          <div className={s.success}>收到了，谢谢！你的回答只给商会工作人员看，不会公开。</div>
          <Link href="/zh/jobs" className={`${s.btn} ${s.btnBlock}`}>回找工人 · 接活儿</Link>
        </>
      )}
      {f && !done && !f.answered && (
        <>
          <p className={s.lead}>关于「{f.title}」，点一下就行。</p>
          <div className={s.field}><span className={s.label}>1. {q('reached')}</span>{yesNo('reached', '联系上了', '没联系上')}</div>
          {a.reached === true && <div className={s.field}><span className={s.label}>2. {q('deal')}</span>{yesNo('deal', '成了', '没成')}</div>}
          {a.reached === true && a.deal !== null && <div className={s.field}><span className={s.label}>3. {q('satisfied')}</span>{yesNo('satisfied', '满意', '不满意')}</div>}
          {busy && <p className={s.muted}>正在提交…</p>}
          <p className={s.small}>你的回答只给商会工作人员看，不会公开。</p>
        </>
      )}
      <Disclaimer />
    </div>
  );
}
