'use client';
/**
 * 后台「活儿」：所有发布的活儿——状态（自动更新）、联系次数、到期日；可下架、写备注。工作人员不代接活人联系发布人，这里不提供电话外呼。
 * 1.5.1 指令 46：小程序里交来的（请商会找师傅）先是「商会在看」，排在最前面，带原话和电话；看过点「派给师傅」才通知对口的接活人，不合适点「不派」。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDate, fmtDateTime } from '@/components/crm/client';

type P = { id: string; title: string; city: string; status: string; fromMp?: boolean; description?: string; phone?: string | null; secStatus?: string | null; statusLabel: string; closeReason: string | null; tradeName: string; posterLabel: string; posterName: string; createdAt: string; expiresAt: string; budget: string | null; contactCount: number; notifiedCount: number; openReports: number; firstContactAt: string | null; note: string | null };
const FILTERS = [['', '全部'], ['pending', '小程序交来·待派'], ['open', '找人中'], ['found', '已找到'], ['closed', '已关闭 / 到期'], ['removed', '已下架']] as const;

export default function StaffJobsPosts() {
  return (
    <StaffGate title="活儿" role="ops" wide>
      {() => <Posts />}
    </StaffGate>
  );
}

/** 地址里的 ?status= / ?id=（「今天」「等你处理」点进来带 id = 那一条活儿） */
function linkParam(k: string): string | null {
  return typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get(k) : null;
}

function Posts() {
  // 指令 102：没带 status 打开时先看有没有待审的——有活儿等派就停在「小程序交来·待派」；没有活儿等派、有接活人等核验就直接去「接活人核验」
  const [status, setStatus] = useState<string | null>(() => linkParam('status') ?? (linkParam('id') ? '' : null));
  const [focus] = useState(() => linkParam('id'));
  const [pendingN, setPendingN] = useState(0);
  const [rows, setRows] = useState<P[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    api<{ pros: number; posts: number }>('/api/v1/workbench/jobs/counts').then((r) => {
      const c = r.ok ? r.data : { pros: 0, posts: 0 };
      setPendingN(c.posts);
      if (status !== null) return;
      if (c.posts > 0) setStatus('pending');
      else if (c.pros > 0) window.location.replace('/zh/staff/jobs/pros');
      else setStatus('');
    });
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    if (status === null) return;
    const r = await api<{ items: P[] }>(`/api/v1/workbench/jobs/posts${status ? `?status=${status}` : ''}`);
    if (r.ok) setRows(r.data.items); else setMsg({ ok: false, text: r.message });
  }, [status]);
  useEffect(() => { setRows(null); load(); }, [load]);
  useEffect(() => { if (focus && rows?.some((p) => p.id === focus)) document.getElementById(`post-${focus}`)?.scrollIntoView({ block: 'center' }); }, [rows, focus]);
  async function act(id: string, b: Record<string, unknown>, okText: string) {
    const r = await api(`/api/v1/workbench/jobs/posts/${id}`, { body: b });
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: (r.data as { message?: string } | undefined)?.message ?? okText });
    load();
  }
  return (
    <>
      <p className={styles.small}>状态自动更新：14 天到期自动下架，发布人自己可改“已找到 / 已关闭”。这里能下架违规的活儿、写备注（备注只有工作人员看得到）。点标题看活儿页面。工作人员不代接活人联系发布人。</p>
      <div className={styles.tabs}>
        {FILTERS.map(([k, l]) => <button key={k} className={`${styles.tab} ${status === k ? styles.tabOn : ''}`} onClick={() => setStatus(k)}>{l}{k === 'pending' && pendingN > 0 ? <span className={styles.badge} style={{ marginLeft: 6, background: "#d64545", borderColor: "#d64545", color: "#fff", fontWeight: 700 }}>{pendingN}</span> : null}</button>)}
      </div>
      <Msg m={msg} />
      {!rows && <p className={styles.muted}>正在加载…</p>}
      {rows && rows.length === 0 && <p className={styles.muted}>{status === 'pending' ? '小程序交来的都处理完了。' : status ? '这个状态下没有活儿。' : '还没有人发布活儿。'}</p>}
      {focus && rows && !rows.some((p) => p.id === focus) && <p className={styles.notice}>要找的那一条已经处理过了（不在这一栏里）。</p>}
      {rows?.map((p) => <div key={p.id} id={`post-${p.id}`} style={focus === p.id ? { outline: '2px solid var(--gold)', borderRadius: 8 } : undefined}><Row p={p} act={act} /></div>)}
    </>
  );
}

function Row({ p, act }: { p: P; act: (id: string, b: Record<string, unknown>, ok: string) => void }) {
  const [note, setNote] = useState(p.note ?? '');
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={styles.card} style={p.status === 'open' || p.status === 'pending' ? { borderLeft: '3px solid var(--gold)' } : undefined}>
      <div><a href={`/zh/jobs/posts/${p.id}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ivory)' }}><b>{p.title}</b></a> <span className={`${styles.badge} ${p.status === 'open' ? '' : styles.badgeMuted}`}>{p.closeReason === 'expired' ? '已到期' : p.statusLabel}</span>{p.openReports ? <span className={`${styles.badge} ${styles.badgeRed}`}>投诉 {p.openReports}</span> : null}{p.status === 'open' && !p.firstContactAt && Date.now() - new Date(p.createdAt).getTime() > 864e5 ? <span className={`${styles.badge} ${styles.badgeRed}`}>24 小时没人联系</span> : null}</div>
      {p.fromMp && <div className={styles.small}><span className={styles.badge}>小程序交来</span> 原话：“{p.description}”{p.phone ? <> · 电话 <a href={`tel:${p.phone}`} style={{ color: 'var(--ivory)' }}>{p.phone}</a></> : null}{p.secStatus === 'review' ? ' · 微信检测建议人工看一眼' : p.secStatus === 'unchecked' ? ' · 没过微信检测（测试站不检测 / 接口没回）' : ''}</div>}
      <div className={styles.small}>{p.fromMp ? '客户' : p.posterLabel} · {p.posterName} · {p.tradeName} · {p.city}{p.budget ? ` · 预算 ${p.budget}` : ''}</div>
      <div className={styles.small}>发布 {fmtDateTime(p.createdAt)} · 到期 {fmtDate(p.expiresAt)} · 已通知 {p.notifiedCount} 人 · 联系 {p.contactCount} 次{p.firstContactAt ? ` · 第一次有人联系 ${fmtDateTime(p.firstContactAt)}` : ''}</div>
      <div className={styles.inputRow}>
        <input className={styles.input} placeholder="备注（只有工作人员看得到）" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={note === (p.note ?? '')} onClick={() => act(p.id, { action: 'note', note }, '备注已保存')}>存备注</button>
        {p.status === 'pending' && <button className={styles.btn} onClick={() => act(p.id, { action: 'approve', note: note || undefined }, '已派出')}>派给师傅</button>}
        {p.status !== 'removed' && (confirm ? (
          <>
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => { setConfirm(false); act(p.id, { action: 'remove', note: note || undefined }, p.status === 'pending' ? '已不派，这一条不会通知任何人' : '已下架，发布人和接活人都看不到这条了'); }}>{p.status === 'pending' ? '确认不派' : '确认下架'}</button>
            <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setConfirm(false)}>不下架</button>
          </>
        ) : (
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setConfirm(true)}>{p.status === 'pending' ? '不派' : '下架'}</button>
        ))}
      </div>
    </div>
  );
}
