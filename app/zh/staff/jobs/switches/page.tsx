'use client';
/** 后台「找工人接活开关」：三个开关，改动前确认；记谁、什么时候改的 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Sw = { find: boolean; work: boolean; requirePaid: boolean };
type Change = { updatedBy: string | null; updatedAt: string } | null;
const ITEMS: { k: keyof Sw; name: string; on: string; off: string }[] = [
  { k: 'find', name: '「找工人／施工队」栏目', on: '打开后，首页和网站出现「找工人／施工队」；只显示已经有核验通过的人的工种。', off: '关掉后，普通人看不到这个栏目，直接打开页面看到"这个功能还没开放"。工作人员照常能看。' },
  { k: 'work', name: '「我要接活」栏目', on: '打开后，首页和网站出现「我要接活」：登记接活、看全部活儿。', off: '关掉后，普通人看不到这个栏目。工作人员照常能看。' },
  { k: 'requirePaid', name: '接活是否要求缴费会员', on: '打开（默认）：施工队、持牌师傅、专业服务要核验通过并且是缴费会员，才上列表、才能看发布人电话。工人一直免费。', off: '关掉：核验通过就能上列表、看电话，不要求缴费会员。' }
];

export default function StaffJobsSwitches() {
  return (
    <StaffGate title="找工人接活开关" role="ops">
      {(me) => <Switches admin={me.roles.includes('admin')} />}
    </StaffGate>
  );
}

function Switches({ admin }: { admin: boolean }) {
  const [sw, setSw] = useState<Sw | null>(null);
  const [changes, setChanges] = useState<Record<string, Change>>({});
  const [ask, setAsk] = useState<{ k: keyof Sw; v: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ switches: Sw; changes: Record<string, Change> }>('/api/v1/workbench/jobs/switches');
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setSw(r.data.switches);
    setChanges(r.data.changes ?? {});
  }, []);
  useEffect(() => { load(); }, [load]);
  async function save() {
    if (!ask) return;
    setBusy(true);
    const r = await api<{ switches: Sw }>('/api/v1/workbench/jobs/switches', { method: 'PATCH', body: { [ask.k]: ask.v } });
    setBusy(false);
    const it = ITEMS.find((x) => x.k === ask.k)!;
    setAsk(null);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: `已${ask.v ? '打开' : '关掉'}${it.name}` });
    load();
  }
  if (!sw) return msg ? <Msg m={msg} /> : <p className={styles.muted}>正在加载…</p>;
  return (
    <>
      <p className={styles.small}>网站后台和手机工作台改的是同一组开关。每次改动都要先确认，并记下谁、什么时候改的。</p>
      <Msg m={msg} />
      {ITEMS.map((it) => (
        <div key={it.k} className={styles.card}>
          <div className={styles.row}>
            <span><b>{it.name}</b></span>
            <span className={`${styles.badge} ${sw[it.k] ? styles.badgeGreen : styles.badgeMuted}`}>{sw[it.k] ? '开着' : '关着'}</span>
          </div>
          <p className={styles.small}>{sw[it.k] ? it.on : it.off}</p>
          <p className={styles.small}>{changes[it.k] ? `上次改动：${changes[it.k]!.updatedBy?.replace(/^staff:/, '') ?? '—'}，${fmtDateTime(changes[it.k]!.updatedAt)}` : '还没人改过（默认值）'}</p>
          {ask?.k === it.k ? (
            <div className={styles.notice}>
              确定要{ask.v ? '打开' : '关掉'}{it.name}吗？{ask.v ? it.on : it.off}
              <div className={styles.btnRow} style={{ marginTop: '0.5rem' }}>
                <button className={styles.btn} disabled={busy} onClick={save}>{busy ? '正在保存…' : `确定${ask.v ? '打开' : '关掉'}`}</button>
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setAsk(null)}>不改了</button>
              </div>
            </div>
          ) : (
            <button className={`${styles.btn} ${sw[it.k] ? styles.btnQuiet : ''}`} disabled={!admin} onClick={() => setAsk({ k: it.k, v: !sw[it.k] })}>{!admin ? '只有管理员能改' : sw[it.k] ? '关掉' : '打开'}</button>
          )}
        </div>
      ))}
      <p className={styles.small}>每次改动的完整记录在系统操作日志里（谁、什么时候、改前改后）。只有管理员能改；运营能看。</p>
    </>
  );
}
