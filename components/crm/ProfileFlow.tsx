'use client';
/**
 * 渐进式补资料：先“用一句话介绍自己”（S01），然后一屏一题选填。
 * 每题提示（+10 / 本项不计分…）直接用服务端 itemBadge() 的结果，与实际发分一致。
 * 每题可“跳过”，随时可“完成”离开；之后从“我的资料”接着填（同一任务）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from './client';
import { QuestionInput, isAnswered, toValue, type AnswerDraft, type QuestionDTO } from './Questions';
import s from './crm.module.css';

type Next = {
  taskId: string;
  question: QuestionDTO | null;
  remaining: number;
  s01: QuestionDTO | null;
  earnedThisTask: number;
  completeness: { done: number; total: number };
};

export function ProfileFlow({ taskId, eventSlug, intro, doneHref = '/zh/me', doneLabel = '完成' }: { taskId?: string | null; eventSlug?: string | null; intro?: string | null; doneHref?: string; doneLabel?: string }) {
  const [data, setData] = useState<Next | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnswerDraft | undefined>();
  const [s01, setS01] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const load = useCallback(async () => {
    const qs = taskId ? `?taskId=${encodeURIComponent(taskId)}` : eventSlug ? `?event=${encodeURIComponent(eventSlug)}` : '';
    const r = await api<Next>(`/api/v1/profile/next${qs}`);
    if (!r.ok) return setErr(r.message);
    setErr(null);
    setData(r.data);
    setDraft(undefined);
  }, [taskId, eventSlug]);

  useEffect(() => {
    load();
  }, [load]);

  async function answer(code: string, value: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    const r = await api<{ pointsAwarded: number; message: string; needsMoreText: boolean }>('/api/v1/profile/answer', {
      body: { taskId: data?.taskId, code, value }
    });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setToast(r.data.message);
    setTimeout(() => setToast(null), 2500);
    if (code === 'S01' && r.data.needsMoreText) return; // 留在原处补充
    if (code === 'S01') setS01('');
    await load();
  }

  async function skip(code: string) {
    if (busy) return;
    setBusy(true);
    await api('/api/v1/profile/skip', { body: { taskId: data?.taskId, code } });
    setBusy(false);
    await load();
  }

  if (err && !data) return <p className={s.error}>{err}</p>;
  if (!data) return <p className={s.small}>加载中…</p>;
  const pct = data.completeness.total ? Math.round((data.completeness.done / data.completeness.total) * 100) : 0;
  const q = data.question;

  if (finished || (!q && !data.s01)) {
    return (
      <div className={s.card}>
        <p className={s.cardTitle}>{q || data.s01 ? '已保存，下次可以接着填' : '资料都填好了，谢谢您！'}</p>
        <p className={s.muted}>本次已获得 {data.earnedThisTask} 积分 · 核心资料 {data.completeness.done}/{data.completeness.total}</p>
        <Link href={doneHref} className={`${s.btn} ${s.btnBlock}`}>{doneLabel}</Link>
      </div>
    );
  }

  return (
    <div>
      {intro && <p className={s.notice}>{intro}</p>}
      <p className={s.small}>
        核心资料 {data.completeness.done}/{data.completeness.total}
      </p>
      <div className={s.progress}><div className={s.progressBar} style={{ width: `${pct}%` }} /></div>
      {toast && <p className={s.success} role="status">{toast}</p>}
      {err && <p className={s.error} role="alert">{err}</p>}

      {data.s01 && (
        <div className={`${s.card} ${s.cardGold}`}>
          <p className={s.cardTitle}>
            用一句话介绍自己
            {data.s01.badge && <span className={data.s01.badge.points ? s.badge : `${s.badge} ${s.badgeMuted}`}>{data.s01.badge.label}</span>}
          </p>
          <p className={s.small}>做什么、在找什么、能提供什么。一句话就行，可以点键盘上的麦克风说话。</p>
          <textarea className={s.textarea} value={s01} onChange={(e) => setS01(e.target.value)} placeholder="例如：我在橙县做多户开发，在找出资人，也能提供施工资源。" />
          <div className={s.btnRow} style={{ marginTop: '0.6rem' }}>
            <button type="button" className={s.btn} disabled={busy || !s01.trim()} onClick={() => answer('S01', { text: s01 })}>
              {busy ? '处理中…' : '保存介绍'}
            </button>
            <button type="button" className={`${s.btn} ${s.btnQuiet}`} disabled={busy} onClick={() => skip('S01')}>
              跳过
            </button>
          </div>
        </div>
      )}

      {q && (
        <div className={s.card}>
          <p className={s.cardTitle}>
            {q.prompt}
            {q.badge && <span className={q.badge.points ? s.badge : `${s.badge} ${s.badgeMuted}`}>{q.badge.label}</span>}
          </p>
          <QuestionInput q={q} value={draft} onChange={setDraft} />
          <div className={s.btnRow} style={{ marginTop: '1rem' }}>
            <button type="button" className={s.btn} disabled={busy || !isAnswered(q, draft)} onClick={() => answer(q.code, toValue(q, draft!))}>
              {busy ? '处理中…' : '保存，下一题'}
            </button>
            <button type="button" className={`${s.btn} ${s.btnQuiet}`} disabled={busy} onClick={() => skip(q.code)}>
              跳过
            </button>
          </div>
        </div>
      )}

      <div className={s.bottomBar}>
        <div className={s.bottomInner}>
          <span style={{ alignSelf: 'center', color: 'var(--ivory-mute)' }}>本次已获得 <b style={{ color: 'var(--gold-bright)' }}>{data.earnedThisTask}</b> 积分</span>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setFinished(true)}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
