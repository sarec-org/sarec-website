'use client';
/**
 * 后台「主办方试用看板」（方案 11/23 修正 第 10 条）：3–5 家熟人主办方，各看完整两场。
 * 每家一行：开通到第一次发布多久、第一次发布填了多久、发了几场、有没有自己再办第二场、报名 / 签到顺不顺、商会帮了几次、有没有人从「我也要办活动」进来申请。
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Row = { id: string; name: string; status: string; helps: number; openToFirstMin: number | null; firstComposeSecs: number | null; events: number; secondByThemselves: boolean; repeats: number; regs: number; people: number; rate: number | null; selfScan: number; byOrganizer: number; cancelled: number; apps: number; exports: number };
type D = { rows: Row[]; applications: { apps: number; from_events: number } };

const dur = (min: number | null) => (min == null ? '还没发' : min < 60 ? `${min} 分钟` : min < 1440 ? `${Math.round(min / 60)} 小时` : `${Math.round(min / 1440)} 天`);
const secs = (s: number | null) => (s == null ? '—' : s < 60 ? `${s} 秒` : `${Math.floor(s / 60)} 分 ${s % 60} 秒`);

export default function Trial() {
  return <StaffGate title="主办方试用看板" role="ops" wide>{() => <Board />}</StaffGate>;
}

function Board() {
  const [d, setD] = useState<D | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { api<D>('/api/v1/staff/organizers?view=trial').then((r) => (r.ok ? setD(r.data) : setMsg({ ok: false, text: r.message }))); }, []);
  if (!d) return msg ? <Msg m={msg} /> : <p className={styles.muted}>正在加载…</p>;
  return (
    <>
      <p className={styles.small}>试用口径（指挥窗口暂定，东哥可改）：3–5 家熟人主办方，各看完整两场。「商会帮忙」在 <Link href="/zh/staff/organizers">主办方 ›</Link> 页每家下面点「记一次商会帮忙」。</p>
      <p>从「我也要办活动」进来的申请：一共 {d.applications.apps} 条，其中 {d.applications.from_events} 条是从主办方活动页点进来的。</p>
      {!d.rows.length ? <p className={styles.muted}>还没有开通任何主办方</p> : (
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr>
          <th>主办方</th><th>开通到第一次发布</th><th>第一次发布填了多久</th><th>发了几场</th><th>自己再办第二场</th><th>报名人次 / 人数</th><th>到场率</th><th>签到：自己扫码 / 主办方点</th><th>取消</th><th>商会帮忙</th><th>导出名单</th><th>带来的申请</th>
        </tr></thead><tbody>
          {d.rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}{r.status === 'suspended' ? '（已停用）' : r.status === 'pending' ? '（还没开通）' : ''}</td>
              <td>{dur(r.openToFirstMin)}</td><td>{secs(r.firstComposeSecs)}</td><td>{r.events}</td>
              <td>{r.secondByThemselves ? `是${r.repeats ? `（用了 ${r.repeats} 次「再办一场」）` : ''}` : '还没有'}</td>
              <td>{r.regs} / {r.people}</td><td>{r.rate == null ? '—' : r.rate + '%'}</td><td>{r.selfScan} / {r.byOrganizer}</td>
              <td>{r.cancelled}</td><td>{r.helps} 次</td><td>{r.exports} 次</td><td>{r.apps}</td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  );
}
