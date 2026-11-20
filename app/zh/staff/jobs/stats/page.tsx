'use client';
/** 后台「找工人接活统计」：每个工种的点击数、活儿数、联系次数、成了的数、平均多久有人联系 */
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Row = { key: string; name: string; group: string; clicks: number; pros: number; posts: number; contacts: number; deals: number; avgHoursToContact: number | null };
type Res = { days: number; trades: Row[]; pros: Record<string, number>; followups: { sent: number; answered: number; reached: number; deal: number; satisfied: number } };

export default function StaffJobsStats() {
  return (
    <StaffGate title="找工人接活统计" role="ops" wide>
      {() => <Stats />}
    </StaffGate>
  );
}

function Stats() {
  const [d, setD] = useState<Res | null>(null);
  const [days, setDays] = useState(90);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setD(null); api<Res>(`/api/v1/workbench/jobs/stats?days=${days}`).then((r) => (r.ok ? setD(r.data) : setMsg({ ok: false, text: r.message }))); }, [days]);
  if (!d) return msg ? <Msg m={msg} /> : <p className={styles.muted}>正在加载…</p>;
  const rows = [...d.trades].filter((r) => r.clicks || r.posts || r.pros).sort((a, b) => b.posts - a.posts || b.clicks - a.clicks);
  const withAvg = rows.filter((r) => r.avgHoursToContact != null);
  const avgAll = withAvg.length ? withAvg.reduce((n, r) => n + r.avgHoursToContact! * r.posts, 0) / withAvg.reduce((n, r) => n + r.posts, 0) : null;
  const sum = (k: keyof Row) => rows.reduce((n, r) => n + (Number(r[k]) || 0), 0);
  const hrs = (h: number | null) => (h == null ? '—' : h < 1 ? `${Math.round(h * 60)} 分钟` : h < 48 ? `${h.toFixed(1)} 小时` : `${(h / 24).toFixed(1)} 天`);
  return (
    <>
      <div className={styles.tabs}>
        {[30, 90, 365].map((n) => <button key={n} className={`${styles.tab} ${days === n ? styles.tabOn : ''}`} onClick={() => setDays(n)}>最近 {n} 天</button>)}
      </div>
      <p className={styles.small}>“成了”= 第 7 天回访里回答“成了”，或发布人自己标了“已找到”。“平均多久有人联系”= 活儿发布到第一次有人看电话。“在列表上”是现在的人数。</p>
      <p className={styles.small}>接活人：{Object.entries(d.pros).map(([k, n]) => `${({ pending: '核验中', verified: '核验通过', returned: '退回', removed: '下架', draft: '没提交' } as Record<string, string>)[k] ?? k} ${n}`).join(' · ') || '还没有'}；回访：发出 {d.followups?.sent ?? 0}，回答 {d.followups?.answered ?? 0}，联系上 {d.followups?.reached ?? 0}，成了 {d.followups?.deal ?? 0}，满意 {d.followups?.satisfied ?? 0}。</p>
      {rows.length === 0 ? <p className={styles.muted}>这段时间还没有数据。</p> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>工种</th><th>点击</th><th>在列表上</th><th>活儿</th><th>联系次数</th><th>成了</th><th>平均多久有人联系</th></tr></thead>
            <tbody>
              {rows.map((r) => <tr key={r.key}><td>{r.name}</td><td>{r.clicks}</td><td>{r.pros}</td><td>{r.posts}</td><td>{r.contacts}</td><td>{r.deals}</td><td>{hrs(r.avgHoursToContact)}</td></tr>)}
              <tr><td><b>合计</b></td><td><b>{sum('clicks')}</b></td><td>—</td><td><b>{sum('posts')}</b></td><td><b>{sum('contacts')}</b></td><td><b>{sum('deals')}</b></td><td>{hrs(avgAll)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
