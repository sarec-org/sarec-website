'use client';
/** 东哥 11/12 定：小程序线上报错看板。按天汇总，这一天第一次出现的错误类型标红。只有次数，不带任何个人信息。 */
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Row = { day: string; sig: string; page: string; api: string; status: number; code: string; versions: string[]; n: number; isNew: boolean };
const STATUS: Record<number, string> = { 0: '网络不通', 401: '没登录', 403: '没权限', 404: '找不到', 429: '太频繁', 500: '服务器出错', 502: '上游出错', 503: '暂时不可用' };

export default function ClientErrors() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const [days, setDays] = useState(14);
  useEffect(() => {
    api<{ rows: Row[] }>(`/api/v1/staff/client-errors?days=${days}`).then((r) => (r.ok ? setRows(r.data.rows) : setErr(r.message)));
  }, [days]);
  const byDay = new Map<string, Row[]>();
  for (const r of rows ?? []) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
  return (
    <StaffGate title="线上报错" role={['ops', 'admin']} wide>
      {() => (
        <>
          <p className={styles.lead}>小程序里出现报错时自动上报（页面、接口、状态码、版本号，不带个人信息）。红色 = 这一天第一次出现的错误类型。</p>
          <div className={styles.btnRow}>
            {[7, 14, 30].map((d) => <button key={d} className={`${styles.btn} ${d === days ? '' : styles.btnQuiet}`} onClick={() => setDays(d)}>最近 {d} 天</button>)}
          </div>
          {err && <p className={styles.error}>{err}</p>}
          {rows && !rows.length && <p className={styles.small}>最近 {days} 天没有报错。</p>}
          {Array.from(byDay.entries()).map(([day, list]) => (
            <div key={day} className={styles.card} style={{ marginTop: 12 }}>
              <p className={styles.cardTitle}>{day} · {list.reduce((s, x) => s + x.n, 0)} 次 · {list.length} 类{list.some((x) => x.isNew) ? ` · 新出现 ${list.filter((x) => x.isNew).length} 类` : ''}</p>
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead><tr><th>次数</th><th>页面</th><th>接口</th><th>状态</th><th>版本</th></tr></thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.sig} style={r.isNew ? { background: 'rgba(192,57,43,0.25)' } : undefined}>
                        <td>{r.n}{r.isNew ? ' 新' : ''}</td>
                        <td className={styles.small}>{r.page}</td>
                        <td className={styles.small} style={{ wordBreak: 'break-all' }}>{r.api}</td>
                        <td className={styles.small}>{r.status} {STATUS[r.status] ?? ''}{r.code ? ` · ${r.code}` : ''}</td>
                        <td className={styles.small}>{r.versions.filter(Boolean).join('、')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </StaffGate>
  );
}
