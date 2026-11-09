'use client';
/** 1.3.1 A1：补登记到场——实际来了但系统没记上的人（例如 11/6），按手机号找档案，找不到就新建，补报名并记到场；留操作记录 */
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Ev = { id: string; slug: string; title: string; starts_at: string };
type Log = { created_at: string; actor: string; reason: string | null; name: string; member_no: number };

export default function Backfill() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [eventId, setEventId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cc, setCc] = useState('+1');
  const [note, setNote] = useState('');
  const [log, setLog] = useState<Log[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ events: Ev[] }>('/api/v1/staff/events').then((r) => {
      if (!r.ok) return setMsg({ ok: false, text: r.message });
      const past = r.data.events.filter((e) => new Date(e.starts_at).getTime() < Date.now() + 86400_000).sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at));
      setEvents(past);
      if (past[0]) setEventId(past[0].id);
    });
  }, []);
  useEffect(() => {
    if (!eventId) return;
    api<{ log: Log[] }>(`/api/v1/workbench/backfill?eventId=${eventId}`).then((r) => r.ok && setLog(r.data.log));
  }, [eventId, msg]);
  const submit = async () => {
    setBusy(true);
    const r = await api<{ created: boolean }>('/api/v1/workbench/backfill', { body: { eventId, name, phone, cc, note } });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: `已补登记：${name}${r.data.created ? '（新建档案）' : '（已有档案）'}` });
    setName(''); setPhone(''); setNote('');
  };
  return (
    <StaffGate title="补登记到场" role="checkin">
      {() => (
        <>
          <p className={styles.small}>实际来了、系统没记上的人在这里补。按手机号找已有档案，找不到就新建一份；活动结束后也能补。每一条都留操作记录。</p>
          <Msg m={msg} />
          <div className={styles.card}>
            <label className={styles.label}>哪一场</label>
            <select className={styles.select} value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.map((e) => <option key={e.id} value={e.id}>{fmtDateTime(e.starts_at)} · {e.title}</option>)}
            </select>
            <label className={styles.label}>姓名</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            <label className={styles.label}>手机号</label>
            <div className={styles.inputRow}>
              <select className={styles.select} value={cc} onChange={(e) => setCc(e.target.value)} style={{ maxWidth: 110 }}>
                <option value="+1">美国 +1</option><option value="+86">中国 +86</option>
              </select>
              <input className={styles.input} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <label className={styles.label}>备注（选填，例如“现场纸质签到表第 3 页”）</label>
            <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} />
            <button className={styles.btn} disabled={busy || !eventId || !name.trim()} onClick={submit}>{busy ? '正在补登记…' : '补登记到场'}</button>
          </div>
          <h2 className={styles.h}>这场的补登记记录（{log.length}）</h2>
          {!log.length && <p className={styles.muted}>还没有。</p>}
          {!!log.length && (
            <table className={styles.table}>
              <thead><tr><th>时间</th><th>谁</th><th>补了谁</th><th>备注</th></tr></thead>
              <tbody>{log.map((l, i) => <tr key={i}><td>{fmtDateTime(l.created_at)}</td><td>{l.actor.replace(/^staff:/, '')}</td><td>#{l.member_no} {l.name}</td><td>{l.reason ?? ''}</td></tr>)}</tbody>
            </table>
          )}
        </>
      )}
    </StaffGate>
  );
}
