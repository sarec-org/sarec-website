'use client';
import Link from 'next/link';
import { phaseLabel } from '@/components/crm/staff/EventHub';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime, money } from '@/components/crm/client';
import { EventForm } from './EventForm';

type Row = { id: string; slug: string; title: string; starts_at: string; fee_cents: number; capacity: number | null; registration_open: boolean; is_listed: boolean; event_status: string; registered: number; waitlisted: number; checked_in: number; arrived_pending: number; internal?: number };
// 后台综合优化 六.2：状态按时间算（结束了就是“已结束”），见 phaseLabel

export default function StaffEvents() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  // 指令 89-B 验收 P1：从搜索「导出 / 名单 / 报名名单」过来（?want=list）时，最上面告诉人点哪里
  const [wantList, setWantList] = useState(false);
  useEffect(() => setWantList(new URLSearchParams(location.search).get('want') === 'list'), []);
  useEffect(() => {
    api<{ events: Row[] }>('/api/v1/staff/events').then((r) => (r.ok ? setRows(r.data.events) : setErr(r.message)));
  }, []);
  return (
    <StaffGate title="活动" role={['ops', 'checkin']}>
      {(s) => (
        <>
          {err && <div className={styles.error}>{err}</div>}
          {wantList && (
            <div className={styles.notice} role="note">
              要哪一场的报名名单，就点那一行右边的「名单 ›」：名单在那一页最上面，旁边有「导出报名名单（Excel）」。
            </div>
          )}
          {can(s, 'ops') && !creating && (
            <button className={`${styles.btn} ${styles.btnBlock}`} onClick={() => setCreating(true)}>
              + 新建活动
            </button>
          )}
          {creating && <EventForm onSaved={(r) => router.push(`/zh/staff/events/${r.id}`)} />}
          <ul className={styles.list}>
            {rows?.map((e) => (
              <li key={e.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                <Link href={`/zh/staff/events/${e.id}`} className={styles.listItem} style={{ flex: 1, minWidth: 0 }}>
                  <strong>{e.title}</strong>
                  {(() => { const ph = phaseLabel(e); return <span className={`${styles.badge} ${ph.key === 'live' || ph.key === 'upcoming' ? '' : styles.badgeMuted}`}>{ph.label}</span>; })()}
                  {!e.is_listed && <span className={`${styles.badge} ${styles.badgeMuted}`}>不公开</span>}
                  {!e.registration_open && <span className={`${styles.badge} ${styles.badgeMuted}`}>报名已关闭</span>}
                  <div className={styles.small}>
                    {fmtDateTime(e.starts_at)} · {e.fee_cents ? money(e.fee_cents) : '免费'} · 报名 {e.registered}
                    {e.capacity ? `/${e.capacity}` : ''} · 候补 {e.waitlisted} · 已签到 {e.checked_in}
                    {e.arrived_pending ? ` · 到场待核款 ${e.arrived_pending}` : ''}
                    {e.internal ? ` · 另有内部 / 测试账号 ${e.internal}` : ''}
                  </div>
                </Link>
                {/* 指令 89-B 验收 P1：每行一个「名单 ›」，直接到这场的报名名单（能导出） */}
                <Link href={`/zh/staff/events/${e.id}#regs`} className={`${styles.btn} ${styles.btnGhost}`} style={{ alignSelf: 'center', minHeight: 44, padding: '0.4rem 0.9rem', whiteSpace: 'nowrap' }}>
                  名单 ›
                </Link>
              </li>
            ))}
            {rows && !rows.length && <p className={styles.muted}>还没有活动，点上面“新建活动”。</p>}
          </ul>
        </>
      )}
    </StaffGate>
  );
}
