'use client';
/**
 * 功能排行（1.3 L）：用数据决定首页放什么。
 * - 每个功能：用了多少次、多少人；带来访问 → 报名 → 到场 → 入会 → 有效咨询（按最后一次带来这个人的功能归因，另列首次来源）。
 * - 7 天 / 30 天 / 每场活动切换；活动少于 2 场时注明“样本太少，仅供参考”。
 * - 首页 8 个入口顺序在这里调，小程序立即生效。不做按数据自动重排。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type F = { visits: number; registered: number; arrived: number; joined: number; inquiries: number; firstTouch: number };
type Row = { key: string; label: string; group: string; times: number; people: number; brings: F | null };
type Data = { rows: Row[]; eventsInWindow: number; sampleTooSmall: boolean; homeEntries: { key: string; label: string }[]; homeOrder: string[] };
type Ev = { id: string; title: string };

export default function StaffFeatures() {
  const [win, setWin] = useState('30');
  const [data, setData] = useState<Data | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const q = win.startsWith('ev:') ? `eventId=${win.slice(3)}` : `days=${win}`;
    const r = await api<Data>(`/api/v1/staff/features?${q}`);
    if (r.ok) {
      setData(r.data);
      setOrder(r.data.homeOrder);
    } else setMsg({ ok: false, text: r.message });
  }, [win]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api<{ events: Ev[] }>('/api/v1/staff/events').then((r) => r.ok && setEvents(r.data.events ?? []));
  }, []);
  const label = (k: string) => data?.homeEntries.find((e) => e.key === k)?.label ?? k;
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }
  async function saveOrder() {
    const r = await api<{ homeOrder: string[] }>('/api/v1/staff/features', { body: { homeOrder: order } });
    setMsg(r.ok ? { ok: true, text: '首页入口顺序已保存，小程序下次打开首页就是新顺序' } : { ok: false, text: r.message });
  }
  async function preview() {
    const r = await api<{ report: { subject: string; text: string } }>('/api/v1/staff/features?report=1');
    if (r.ok) setReport(`${r.data.report.subject}\n\n${r.data.report.text}`);
  }
  const groups = ['首页入口', '传播', '获客', '照片'];
  return (
    <StaffGate title="功能排行" role="ops">
      {() => (
        <>
          <Msg m={msg} />
          <div className={styles.inputRow} style={{ marginBottom: 12 }}>
            <select className={styles.select} value={win} onChange={(e) => setWin(e.target.value)} aria-label="时间范围">
              <option value="7">最近 7 天</option>
              <option value="30">最近 30 天</option>
              {events.map((e) => <option key={e.id} value={`ev:${e.id}`}>活动：{e.title}</option>)}
            </select>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={preview}>预览本月功能月报</button>
          </div>
          {data?.sampleTooSmall && <div className={styles.notice}>这段时间只有 {data.eventsInWindow} 场活动，样本太少，仅供参考。</div>}
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead><tr><th>功能</th><th>次数</th><th>人数</th><th>带来访问</th><th>报名</th><th>到场</th><th>入会</th><th>有效咨询</th><th>首次来源</th></tr></thead>
              <tbody>
                {groups.flatMap((g) => [
                  <tr key={`g-${g}`}><td colSpan={9} className={styles.small} style={{ fontWeight: 700, paddingTop: 16 }}>{g}</td></tr>,
                  ...(data?.rows.filter((r) => r.group === g).map((r) => (
                    <tr key={r.key}>
                      <td>{r.label.replace('首页入口 · ', '')}</td><td>{r.times}</td><td>{r.people}</td>
                      {r.brings ? (
                        <><td>{r.brings.visits}</td><td>{r.brings.registered}</td><td>{r.brings.arrived}</td><td>{r.brings.joined}</td><td>{r.brings.inquiries}</td><td>{r.brings.firstTouch}</td></>
                      ) : (
                        <td colSpan={6} className={styles.small}>—（站内入口，不单独归因）</td>
                      )}
                    </tr>
                  )) ?? [])
                ])}
              </tbody>
            </table>
          </div>

          <h2 className={styles.h2}>首页入口顺序</h2>
          <div className={styles.card}>
            <p className={styles.small}>前 4 个在第一行。改完点“保存”，小程序下次打开首页就是新顺序，不用发版本。不会按数据自动重排。</p>
            {order.map((k, i) => (
              <div key={k} className={styles.row} style={{ alignItems: 'center' }}>
                <span className={styles.rowLabel}>{i + 1}</span>
                <span className={styles.rowValue}>{label(k)}</span>
                <span style={{ whiteSpace: 'nowrap' }}>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${label(k)} 上移`}>↑</button>{' '}
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`${label(k)} 下移`}>↓</button>
                </span>
              </div>
            ))}
            <button className={styles.btn} style={{ marginTop: 12 }} onClick={saveOrder}>保存顺序</button>
          </div>

          {report && (
            <>
              <h2 className={styles.h2}>功能月报预览（每月 1 号自动发）</h2>
              <pre className={styles.card} style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{report}</pre>
            </>
          )}
        </>
      )}
    </StaffGate>
  );
}
