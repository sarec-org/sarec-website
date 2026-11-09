'use client';
/** 1.3.1 A4：合并重复档案——疑似重复只是提示，助理确认后才合并；合并可撤销 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type P = { id: string; memberNo: number; name: string; phone: string | null; email: string | null; regs: number; createdAt: string };
type Pair = { a: P; b: P; why: string[] };
type M = { id: string; kept_name: string; kept_no: number; merged_name: string; merged_no: number; merged_by: string; created_at: string; undone_at: string | null };

const who = (p: P) => `#${p.memberNo} ${p.name}`;

export default function Duplicates() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [merges, setMerges] = useState<M[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ pairs: Pair[]; merges: M[] }>('/api/v1/staff/duplicates');
    if (r.ok) { setPairs(r.data.pairs); setMerges(r.data.merges); } else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (b: Record<string, string>, ok: string) => {
    const r = await api<{ movedRows?: number; pointsReversed?: number }>('/api/v1/staff/duplicates', { body: b });
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: ok + (r.data.movedRows !== undefined ? `（搬了 ${r.data.movedRows} 条记录，重复积分冲销 ${r.data.pointsReversed ?? 0} 条）` : '') });
    load();
  };
  const Side = ({ p }: { p: P }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div><b>{who(p)}</b></div>
      <div className={styles.small}>{p.phone ?? '没有手机号'} · {p.email ?? '没有邮箱'}</div>
      <div className={styles.small}>报名 {p.regs} 场 · 建档 {fmtDateTime(p.createdAt)}</div>
    </div>
  );
  return (
    <StaffGate title="合并重复档案" role="ops" wide>
      {() => (
        <>
          <p className={styles.small}>
            下面只是“可能是同一个人”的提示（同手机号、同邮箱、同名）。确认是同一人再点合并：报名、签到、缴费、积分明细都搬到保留的那份，重复的积分不相加；合并不会带来管理员权限。合错了可以在下面“合并记录”里撤销。
          </p>
          <Msg m={msg} />
          {!pairs.length && <p className={styles.muted}>现在没有疑似重复的档案。</p>}
          {pairs.map((x) => (
            <div key={x.a.id + x.b.id} className={styles.card}>
              <p className={styles.small} style={{ marginTop: 0 }}>{x.why.join('、')}</p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}><Side p={x.a} /><Side p={x.b} /></div>
              <div className={styles.btnRow}>
                <button className={styles.btn} onClick={() => act({ action: 'merge', keptId: x.a.id, mergedId: x.b.id }, `已合并，保留 ${who(x.a)}`)}>保留 {who(x.a)}，合并另一份</button>
                <button className={styles.btnQuiet} onClick={() => act({ action: 'merge', keptId: x.b.id, mergedId: x.a.id }, `已合并，保留 ${who(x.b)}`)}>保留 {who(x.b)}</button>
                <button className={styles.btnQuiet} onClick={() => act({ action: 'not_dup', a: x.a.id, b: x.b.id }, '已标记不是同一人，以后不再提示')}>不是同一人</button>
              </div>
            </div>
          ))}
          <h2 className={styles.h}>合并记录</h2>
          {!merges.length && <p className={styles.muted}>还没有合并过。</p>}
          {!!merges.length && (
            <table className={styles.table}>
              <thead><tr><th>时间</th><th>保留</th><th>合并掉</th><th>谁做的</th><th></th></tr></thead>
              <tbody>{merges.map((m) => (
                <tr key={m.id}>
                  <td>{fmtDateTime(m.created_at)}</td><td>#{m.kept_no} {m.kept_name}</td><td>#{m.merged_no} {m.merged_name}</td><td>{m.merged_by.replace(/^staff:/, '')}</td>
                  <td>{m.undone_at ? <span className={styles.small}>已撤销</span> : <button className={styles.btnQuiet} onClick={() => act({ action: 'undo', mergeId: m.id }, '已撤销合并，两份档案恢复独立')}>撤销</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </>
      )}
    </StaffGate>
  );
}
