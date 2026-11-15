'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime, money } from '@/components/crm/client';
import { EventForm } from './EventForm';

type Row = { id: string; slug: string; title: string; starts_at: string; fee_cents: number; capacity: number | null; registration_open: boolean; is_listed: boolean; event_status: string; registered: number; waitlisted: number; checked_in: number; arrived_pending: number };
const STATUS: Record<string, string> = { scheduled: '进行中', completed: '已结束', postponed: '延期', cancelled: '已取消' };

export default function StaffEvents() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<{ events: Row[] }>('/api/v1/staff/events').then((r) => (r.ok ? setRows(r.data.events) : setErr(r.message)));
  }, []);
  return (
    <StaffGate title="活动" role={['ops', 'checkin']}>
      {(s) => (
        <>
          {err && <div className={styles.error}>{err}</div>}
          {can(s, 'ops') && !creating && (
            <button className={`${styles.btn} ${styles.btnBlock}`} onClick={() => setCreating(true)}>
              + 新建活动
            </button>
          )}
          {creating && <EventForm onSaved={(r) => router.push(`/zh/staff/events/${r.id}`)} />}
          <ul className={styles.list}>
            {rows?.map((e) => (
              <li key={e.id}>
                <Link href={`/zh/staff/events/${e.id}`} className={styles.listItem}>
                  <strong>{e.title}</strong>
                  <span className={`${styles.badge} ${e.event_status === 'scheduled' ? '' : styles.badgeMuted}`}>{STATUS[e.event_status]}</span>
                  {!e.is_listed && <span className={`${styles.badge} ${styles.badgeMuted}`}>不公开</span>}
                  {!e.registration_open && <span className={`${styles.badge} ${styles.badgeMuted}`}>报名已关闭</span>}
                  <div className={styles.small}>
                    {fmtDateTime(e.starts_at)} · {e.fee_cents ? money(e.fee_cents) : '免费'} · 报名 {e.registered}
                    {e.capacity ? `/${e.capacity}` : ''} · 候补 {e.waitlisted} · 已签到 {e.checked_in}
                    {e.arrived_pending ? ` · 到场待核款 ${e.arrived_pending}` : ''}
                  </div>
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
