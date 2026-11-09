'use client';
/** 1.3.1：一页流程数据——扫码完成签到比例、分享带来的有效报名、报名到场率、入会申请到缴费的转化、重复参加人数、每场人工处理多少项 */
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Ev = { slug: string; title: string; startsAt: string; scans: number; scanDone: number; scanRate: number | null; regs: number; arrived: number; arriveRate: number | null; sharedRegs: number; sharedArrived: number; manual: number; backfill: number };
type D = { events: Ev[]; repeaters: number; attendees: number; join: { total: number; paid: number; link_sent: number; rate: number | null } };
const p = (n: number | null) => (n == null ? '—' : `${n}%`);

export default function FlowStats() {
  const [d, setD] = useState<D | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    api<D>('/api/v1/staff/flow-stats').then((r) => (r.ok ? setD(r.data) : setMsg({ ok: false, text: r.message })));
  }, []);
  return (
    <StaffGate title="流程数据" role="ops" wide>
      {() => (
        <>
          <p className={styles.small}>
            扫码完成签到比例 = 扫了现场码、最后自己签到成功的人 ÷ 扫了现场码的人（1.3.1 起统计；以前的活动没有扫码记录）。人工处理 = 工作人员代签到、现场登记、补登记的人数。
          </p>
          <Msg m={msg} />
          {d && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className={styles.card} style={{ flex: '1 1 200px' }}><p className={styles.cardTitle}>重复参加</p><p style={{ fontSize: 28, margin: 0 }}>{d.repeaters} 人</p><p className={styles.small}>到过 2 场及以上 · 共 {d.attendees} 人到过场</p></div>
                <div className={styles.card} style={{ flex: '1 1 200px' }}><p className={styles.cardTitle}>入会申请 → 入会</p><p style={{ fontSize: 28, margin: 0 }}>{p(d.join.rate)}</p><p className={styles.small}>申请 {d.join.total} · 已发缴费链接 {d.join.link_sent} · 已入会 {d.join.paid}</p></div>
              </div>
              <h2 className={styles.h}>最近的活动</h2>
              {!d.events.length && <p className={styles.muted}>还没有已举办的活动。</p>}
              {!!d.events.length && (
                <table className={styles.table}>
                  <thead><tr><th>活动</th><th>扫码完成签到</th><th>报名到场率</th><th>分享带来的报名（到场）</th><th>人工处理</th></tr></thead>
                  <tbody>{d.events.map((e) => (
                    <tr key={e.slug}>
                      <td>{e.title}<div className={styles.small}>{fmtDateTime(e.startsAt)}</div></td>
                      <td>{e.scans ? `${p(e.scanRate)}（${e.scanDone} / ${e.scans}）` : '—'}</td>
                      <td>{p(e.arriveRate)}（{e.arrived} / {e.regs}）</td>
                      <td>{e.sharedRegs}（{e.sharedArrived}）</td>
                      <td>{e.manual}{e.backfill ? `（含补登记 ${e.backfill}）` : ''}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </StaffGate>
  );
}
