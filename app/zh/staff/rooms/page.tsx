'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime, money } from '@/components/crm/client';

type B = { id: string; room: string; starts_at: string; ends_at: string; status: string; via_pass: boolean; contact_id: string; name: string; phone_e164: string | null; email: string | null; order_no: string | null; order_status: string | null; amount_cents: number | null };
type Ad = { id: string; org_name: string; intro: string; service_area: string | null; qr_url: string | null; asset_url: string | null; months: number; start_month: string | null; status: string; tier_at_apply: string | null; amount_cents: number; staff_note: string | null; name: string; contact_id: string; order_no: string | null; order_status: string | null };
const BSTATUS: Record<string, string> = { held: '待付款', confirmed: '已确认', cancelled: '已取消' };
const ASTATUS: Record<string, string> = { submitted: '待审核', approved: '已通过', scheduled: '已排期', rejected: '未通过', cancelled: '已取消' };

export default function StaffRooms() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<B[] | null>(null);
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [month, setMonth] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const from = new Date(`${day}T00:00:00-08:00`).toISOString();
    const to = new Date(new Date(from).getTime() + 7 * 864e5).toISOString();
    const r = await api<{ bookings: B[] }>(`/api/v1/staff/rooms?from=${from}&to=${to}`);
    if (r.ok) setBookings(r.data.bookings);
    const a = await api<{ ads: Ad[] }>('/api/v1/staff/screen-ads');
    if (a.ok) setAds(a.data.ads);
  }, [day]);
  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id: string) {
    const r = await api('/api/v1/staff/rooms', { body: { bookingId: id, reason: '工作人员取消' } });
    setMsg(r.ok ? { ok: true, text: '预约已取消' } : { ok: false, text: r.message });
    load();
  }
  async function review(id: string, action: string) {
    const r = await api<{ orderNo: string | null; amountCents?: number }>('/api/v1/staff/screen-ads', { body: { id, action, startMonth: month[id], note: note[id] } });
    setMsg(r.ok ? { ok: true, text: action === 'approve' ? (r.data.orderNo ? `已通过，已生成订单 ${r.data.orderNo}（${money(r.data.amountCents ?? 0)}）` : '已通过（免费）') : '已更新' } : { ok: false, text: r.message });
    load();
  }

  return (
    <StaffGate title="会议室与电子屏" role="ops" wide>
      {() => (
        <>
          <Msg m={msg} />
          <h2 className={styles.h2}>会议室预约（7 天）</h2>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="day">起始日期</label>
            <input id="day" type="date" className={styles.input} value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <ul className={styles.list}>
            {bookings?.map((b) => (
              <li key={b.id} className={styles.listItem}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{fmtDateTime(b.starts_at)} – {new Date(b.ends_at).toLocaleTimeString('zh-CN', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false })}</strong> {b.room}
                    <div className={styles.small}>
                      <a href={`/zh/staff/contacts/${b.contact_id}`} style={{ color: 'var(--gold)' }}>{b.name}</a> · {b.phone_e164 ?? b.email} · {BSTATUS[b.status]}
                      {b.via_pass ? ' · 月卡' : b.order_no ? ` · ${b.order_no} ${b.amount_cents != null ? money(b.amount_cents) : ''}` : ''}
                    </div>
                  </div>
                  {b.status !== 'cancelled' && <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => cancel(b.id)}>取消</button>}
                </div>
              </li>
            ))}
            {bookings && !bookings.length && <p className={styles.muted}>这 7 天没有预约。</p>}
          </ul>

          <h2 className={styles.h2}>电子屏轮播申请</h2>
          <p className={styles.small}>副会长、战略伙伴单位免费；其他单位按“设置”里的月费 × 月数生成订单。</p>
          {ads?.map((a) => (
            <div key={a.id} className={`${styles.card} ${a.status === 'submitted' ? styles.cardGold : ''}`}>
              <p className={styles.cardTitle}>{a.org_name} <span className={styles.badge}>{ASTATUS[a.status]}</span></p>
              <p className={styles.small}>申请人 {a.name} · 等级 {a.tier_at_apply ?? '注册用户'} · {a.months} 个月{a.start_month ? ` · 从 ${a.start_month.slice(0, 7)} 开始` : ''}</p>
              <p style={{ margin: '0.25rem 0' }}>{a.intro}</p>
              {a.service_area && <p className={styles.small}>服务区域：{a.service_area}</p>}
              <div className={styles.btnRow} style={{ margin: '0.5rem 0' }}>
                {a.qr_url && <a className={styles.copyBtn} href={a.qr_url} target="_blank" rel="noreferrer">看二维码</a>}
                {a.asset_url && <a className={styles.copyBtn} href={a.asset_url} target="_blank" rel="noreferrer">看素材</a>}
              </div>
              {a.order_no && <p className={styles.small}>订单 {a.order_no}（{a.order_status}）{money(a.amount_cents)}</p>}
              {a.staff_note && <p className={styles.small}>备注：{a.staff_note}</p>}
              {(a.status === 'submitted' || a.status === 'approved') && (
                <>
                  <div className={styles.inputRow} style={{ marginBottom: '0.5rem' }}>
                    <input className={styles.input} type="month" value={month[a.id] ?? ''} onChange={(e) => setMonth({ ...month, [a.id]: e.target.value })} aria-label="排期起始月" />
                    <input className={styles.input} placeholder="备注 / 不通过原因" value={note[a.id] ?? ''} onChange={(e) => setNote({ ...note, [a.id]: e.target.value })} />
                  </div>
                  <div className={styles.btnRow}>
                    {a.status === 'submitted' && <button className={styles.btn} onClick={() => review(a.id, 'approve')}>通过</button>}
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => review(a.id, 'schedule')}>排期</button>
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => review(a.id, 'reject')}>不通过</button>
                  </div>
                </>
              )}
            </div>
          ))}
          {ads && !ads.length && <p className={styles.muted}>暂无申请。</p>}
        </>
      )}
    </StaffGate>
  );
}
