'use client';
/** 后台「找工人接活投诉」：每张接活人卡片、每条活儿上的"反馈 / 投诉"直达这里（同时进「待跟进」）；处理完写一句、标已处理 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type R = { id: string; targetType: 'pro' | 'post'; targetId: string; targetLabel: string | null; reason: string; status: string; handledBy: string | null; handledNote: string | null; createdAt: string; reporterName: string | null };

export default function StaffJobsReports() {
  return (
    <StaffGate title="找工人接活投诉" role="ops" wide>
      {() => <Reports />}
    </StaffGate>
  );
}

function Reports() {
  const [st, setSt] = useState('open');
  const [rows, setRows] = useState<R[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ items: R[] }>(`/api/v1/workbench/jobs/reports?status=${st}`);
    if (r.ok) setRows(r.data.items); else setMsg({ ok: false, text: r.message });
  }, [st]);
  useEffect(() => { setRows(null); load(); }, [load]);
  return (
    <>
      <p className={styles.small}>要下架接活人去「接活人核验」，要下架活儿去「活儿」。这里记下怎么处理的。</p>
      <div className={styles.tabs}>
        {[['open', '没处理'], ['handled', '已处理']].map(([k, l]) => <button key={k} className={`${styles.tab} ${st === k ? styles.tabOn : ''}`} onClick={() => setSt(k)}>{l}</button>)}
      </div>
      <Msg m={msg} />
      {!rows && <p className={styles.muted}>正在加载…</p>}
      {rows && rows.length === 0 && <p className={styles.muted}>{st === 'open' ? '没有要处理的投诉。' : '还没有处理过的投诉。'}</p>}
      {rows?.map((r) => <Row key={r.id} r={r} done={(t) => { setMsg({ ok: true, text: t }); load(); }} fail={(t) => setMsg({ ok: false, text: t })} />)}
    </>
  );
}

function Row({ r, done, fail }: { r: R; done: (t: string) => void; fail: (t: string) => void }) {
  const [note, setNote] = useState('');
  const href = r.targetType === 'post' ? `/zh/jobs/posts/${r.targetId}` : '/zh/staff/jobs/pros';
  return (
    <div className={styles.card}>
      <div><b>{r.targetType === 'pro' ? '接活人' : '活儿'}：</b><a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--ivory)' }}>{r.targetLabel ?? '（已删除）'}</a></div>
      <p style={{ margin: '0.3rem 0' }}>{r.reason}</p>
      <div className={styles.small}>{r.reporterName ?? '没登录的访客'} · {fmtDateTime(r.createdAt)}{r.handledBy ? ` · ${r.handledBy.replace(/^staff:/, '')} 处理：${r.handledNote ?? ''}` : ''}</div>
      {r.status === 'open' && (
        <div className={styles.inputRow} style={{ marginTop: '0.5rem' }}>
          <input className={styles.input} placeholder="怎么处理的（例如：已电话核实，已下架）" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={styles.btn} onClick={async () => { const x = await api(`/api/v1/workbench/jobs/reports/${r.id}`, { body: { note } }); if (x.ok) done('已标为处理完'); else fail(x.message); }}>标为已处理</button>
        </div>
      )}
    </div>
  );
}
