'use client';
/** 后台「活儿」：所有发布的活儿——状态（自动更新）、联系次数、到期日；可下架、写备注。工作人员不代接活人联系发布人，这里不提供电话外呼。 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDate, fmtDateTime } from '@/components/crm/client';

type P = { id: string; title: string; city: string; status: string; statusLabel: string; closeReason: string | null; tradeName: string; posterLabel: string; posterName: string; createdAt: string; expiresAt: string; budget: string | null; contactCount: number; notifiedCount: number; openReports: number; firstContactAt: string | null; note: string | null };
const FILTERS = [['', '全部'], ['open', '找人中'], ['found', '已找到'], ['closed', '已关闭 / 到期'], ['removed', '已下架']] as const;

export default function StaffJobsPosts() {
  return (
    <StaffGate title="活儿" role="ops" wide>
      {() => <Posts />}
    </StaffGate>
  );
}

function Posts() {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<P[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ items: P[] }>(`/api/v1/workbench/jobs/posts${status ? `?status=${status}` : ''}`);
    if (r.ok) setRows(r.data.items); else setMsg({ ok: false, text: r.message });
  }, [status]);
  useEffect(() => { setRows(null); load(); }, [load]);
  async function act(id: string, b: Record<string, unknown>, okText: string) {
    const r = await api(`/api/v1/workbench/jobs/posts/${id}`, { body: b });
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: okText });
    load();
  }
  return (
    <>
      <p className={styles.small}>状态自动更新：14 天到期自动下架，发布人自己可改“已找到 / 已关闭”。这里能下架违规的活儿、写备注（备注只有工作人员看得到）。点标题看活儿页面。工作人员不代接活人联系发布人。</p>
      <div className={styles.tabs}>
        {FILTERS.map(([k, l]) => <button key={k} className={`${styles.tab} ${status === k ? styles.tabOn : ''}`} onClick={() => setStatus(k)}>{l}</button>)}
      </div>
      <Msg m={msg} />
      {!rows && <p className={styles.muted}>正在加载…</p>}
      {rows && rows.length === 0 && <p className={styles.muted}>{status ? '这个状态下没有活儿。' : '还没有人发布活儿。'}</p>}
      {rows?.map((p) => <Row key={p.id} p={p} act={act} />)}
    </>
  );
}

function Row({ p, act }: { p: P; act: (id: string, b: Record<string, unknown>, ok: string) => void }) {
  const [note, setNote] = useState(p.note ?? '');
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={styles.card} style={p.status === 'open' ? { borderLeft: '3px solid var(--gold)' } : undefined}>
      <div><a href={`/zh/jobs/posts/${p.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ivory)' }}><b>{p.title}</b></a> <span className={`${styles.badge} ${p.status === 'open' ? '' : styles.badgeMuted}`}>{p.closeReason === 'expired' ? '已到期' : p.statusLabel}</span>{p.openReports ? <span className={`${styles.badge} ${styles.badgeRed}`}>投诉 {p.openReports}</span> : null}{p.status === 'open' && !p.firstContactAt && Date.now() - new Date(p.createdAt).getTime() > 864e5 ? <span className={`${styles.badge} ${styles.badgeRed}`}>24 小时没人联系</span> : null}</div>
      <div className={styles.small}>{p.posterLabel} · {p.posterName} · {p.tradeName} · {p.city}{p.budget ? ` · 预算 ${p.budget}` : ''}</div>
      <div className={styles.small}>发布 {fmtDateTime(p.createdAt)} · 到期 {fmtDate(p.expiresAt)} · 已通知 {p.notifiedCount} 人 · 联系 {p.contactCount} 次{p.firstContactAt ? ` · 第一次有人联系 ${fmtDateTime(p.firstContactAt)}` : ''}</div>
      <div className={styles.inputRow}>
        <input className={styles.input} placeholder="备注（只有工作人员看得到）" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={note === (p.note ?? '')} onClick={() => act(p.id, { action: 'note', note }, '备注已保存')}>存备注</button>
        {p.status !== 'removed' && (confirm ? (
          <>
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => { setConfirm(false); act(p.id, { action: 'remove', note: note || undefined }, '已下架，发布人和接活人都看不到这条了'); }}>确认下架</button>
            <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setConfirm(false)}>不下架</button>
          </>
        ) : (
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setConfirm(true)}>下架</button>
        ))}
      </div>
    </div>
  );
}
