'use client';
/** 1.3.1 A3：签到选择题题库——来过的人扫码时按“档案缺什么”自动出 1–3 道；都是选择题 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Q = { key: string; prompt: string; options: string[]; sort: number; isActive: boolean; allowText: boolean; answered?: number };

export default function CheckinQuestions() {
  const [qs, setQs] = useState<Q[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ questions: Q[] }>('/api/v1/staff/checkin-questions');
    if (r.ok) setQs(r.data.questions); else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  const set = (i: number, p: Partial<Q>) => setQs((l) => l.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const save = async () => {
    const r = await api('/api/v1/staff/checkin-questions', { method: 'PUT', body: { questions: qs } });
    setMsg(r.ok ? { ok: true, text: '已保存，下一位扫码的人就按新题库出题' } : { ok: false, text: r.message });
    if (r.ok) load();
  };
  return (
    <StaffGate title="签到选择题" role="ops">
      {() => (
        <>
          <p className={styles.small}>来过的人扫码签到时，系统按“他的档案缺哪题”从上往下挑 1–3 道（排序数字小的先问）。都是选择题，题下有“愿意多写一点”（可关）。答一题记 5 分，多写一点再加 5 分。“常住地区”建议一直排第一。</p>
          <Msg m={msg} />
          {qs.map((q, i) => (
            <div key={q.key || i} className={styles.card}>
              <div className={styles.inputRow}>
                <input className={styles.input} style={{ maxWidth: 70 }} type="number" value={q.sort} onChange={(e) => set(i, { sort: Number(e.target.value) })} aria-label="排序" />
                <input className={styles.input} value={q.prompt} onChange={(e) => set(i, { prompt: e.target.value })} aria-label="题目" />
              </div>
              <label className={styles.label}>选项（用顿号或逗号隔开，2–8 个）</label>
              <input className={styles.input} value={q.options.join('、')} onChange={(e) => set(i, { options: e.target.value.split(/[、,，]/) })} />
              <div className={styles.small}>
                编号 {q.key || '（新题，保存时用下面填的编号）'} · 已有 {q.answered ?? 0} 人答过 ·{' '}
                <label><input type="checkbox" checked={q.isActive} onChange={(e) => set(i, { isActive: e.target.checked })} /> 启用</label>{' '}
                <label><input type="checkbox" checked={q.allowText} onChange={(e) => set(i, { allowText: e.target.checked })} /> 允许多写一点</label>
              </div>
              {!q.answered && q.key === '' && <input className={styles.input} placeholder="新题编号，例如 budget" onChange={(e) => set(i, { key: e.target.value.trim() })} />}
            </div>
          ))}
          <div className={styles.btnRow}>
            <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setQs((l) => [...l, { key: '', prompt: '', options: [], sort: 100, isActive: true, allowText: true }])}>加一道题</button>
            <button className={styles.btn} onClick={save}>保存题库</button>
          </div>
        </>
      )}
    </StaffGate>
  );
}
