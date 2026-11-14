'use client';
/**
 * 1.5.0 举报（运营）：小程序里用户举报的组局、个人主页、名片、照片。
 * 默认看“待处理”；每条写清举报理由、补充说明、举报人、被举报内容摘要，能去处理的给“去处理 ›”链接。
 * 处理只是标状态：「处理完了」（已经去对应页面下架 / 禁人了）或「不用处理」。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';
import { Toast } from '@/components/crm/staff/ugcShared';

type Report = {
  id: string; kind: string; target_id: string; reason: string; detail: string | null; status: string;
  reporter_name: string | null; handled_by: string | null; handled_at: string | null; created_at: string;
  summary: { text: string; link: string | null };
};
type Status = 'open' | 'done' | 'dismissed' | 'all';

const TABS: { key: Status; label: string }[] = [
  { key: 'open', label: '待处理' },
  { key: 'done', label: '已处理' },
  { key: 'dismissed', label: '不用处理' },
  { key: 'all', label: '全部' }
];
const KIND: Record<string, string> = { meetup: '组局', profile: '个人主页', card: '电子名片', photo: '照片', club_member: '俱乐部成员' };
const STATUS: Record<string, string> = { open: '待处理', done: '已处理', dismissed: '不用处理' };

function Reports() {
  const [tab, setTab] = useState<Status>('open');
  const [list, setList] = useState<Report[] | null>(null);
  const [open, setOpen] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const r = await api<{ reports: Report[]; open: number }>(`/api/v1/staff/reports?status=${tab}`);
    if (r.ok) { setList(r.data.reports); setOpen(r.data.open); } else setMsg({ ok: false, text: r.message });
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  async function handle(x: Report, status: 'done' | 'dismissed') {
    setBusy(x.id);
    const r = await api<{ message: string }>('/api/v1/staff/reports', { body: { id: x.id, status } });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: `${r.data.message}：${x.summary.text.length > 40 ? x.summary.text.slice(0, 40) + '…' : x.summary.text}` } : { ok: false, text: r.message });
    load();
  }

  return (
    <>
      <p className={styles.lead}>小程序里每个用户发内容的地方都有「举报」。这里看举报、去对应页面处理（下架、禁人），再标一下状态。</p>
      <div className={styles.tabs} role="tablist" aria-label="举报状态">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`${styles.tab} ${tab === t.key ? styles.tabOn : ''}`} onClick={() => { setTab(t.key); setMsg(null); }}>
            {t.label}{t.key === 'open' ? `（${open}）` : ''}
          </button>
        ))}
      </div>
      <Toast m={msg} onClose={closeMsg} />
      {!list && <p className={styles.muted}>正在加载…</p>}
      {list && list.length === 0 && <p className={styles.notice}>{tab === 'open' ? '没有待处理的举报。' : '这里没有举报。'}</p>}
      {list?.map((x) => (
        <div key={x.id} className={`${styles.card} ${x.status === 'open' ? styles.cardGold : ''}`}>
          <p className={styles.cardTitle}>
            {x.reason}
            <span className={styles.badge}>{KIND[x.kind] ?? x.kind}</span>
            <span className={`${styles.badge} ${x.status === 'open' ? styles.badgeRed : styles.badgeMuted}`}>{STATUS[x.status] ?? x.status}</span>
          </p>
          <p style={{ margin: '0.3rem 0' }}>被举报的内容：{x.summary.text}</p>
          {x.detail && <p style={{ margin: '0.3rem 0' }}>补充说明：{x.detail}</p>}
          <p className={styles.small} style={{ margin: '0.3rem 0' }}>
            举报人：{x.reporter_name ?? '（没留名字）'} · {fmtDateTime(x.created_at)}
            {x.handled_by && <> · {x.handled_by} 于 {fmtDateTime(x.handled_at!)} 标为「{STATUS[x.status]}」</>}
          </p>
          <div className={styles.btnRow} style={{ marginTop: '0.6rem' }}>
            {x.summary.link && <Link href={x.summary.link} className={`${styles.btn} ${styles.btnGhost}`}>去处理 ›</Link>}
            {x.status !== 'done' && <button className={styles.btn} disabled={busy === x.id} onClick={() => handle(x, 'done')}>处理完了</button>}
            {x.status !== 'dismissed' && <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy === x.id} onClick={() => handle(x, 'dismissed')}>不用处理</button>}
          </div>
        </div>
      ))}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="举报" wide>
      {() => <Reports />}
    </StaffGate>
  );
}
