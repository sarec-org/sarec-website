'use client';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Ev = { id: string; title: string; starts_at: string; event_status: string; fee_cents: number };
type Person = { id: string; member_no: number; name: string; email: string | null; phone_e164: string | null; role_label: string | null; reg_status: string | null; arrival_status: string | null };
type Result = { kind: string; message: string; orderNo?: string; amountCents?: number };
type Role = { key: string; label: string };

const ICON: Record<string, string> = { checked_in: '✅', already: '✅', pending_payment: '💳', waitlisted: '⏳', rejected: '⛔' };

export default function StaffCheckin() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [eventId, setEventId] = useState('');
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[] | null>(null);
  const [result, setResult] = useState<{ who: string; r: Result } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [onsite, setOnsite] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', roleSub: '' });
  const [roles, setRoles] = useState<Role[]>([]);
  // 1.2 个人签到码：工作人员用手机扫会员的签到码 → 打开本页并定位到这条报名，核对后一键签到
  const [regCard, setRegCard] = useState<(Person & { event_id: string; title: string; starts_at: string; status: string }) | null>(null);

  useEffect(() => {
    api<{ events: Ev[] }>('/api/v1/staff/events').then((r) => {
      if (!r.ok) return;
      const now = Date.now();
      const list = r.data.events.filter((e) => e.event_status === 'scheduled');
      // 默认选今天（或最近一场）
      list.sort((a, b) => Math.abs(new Date(a.starts_at).getTime() - now) - Math.abs(new Date(b.starts_at).getTime() - now));
      setEvents(list);
      if (list[0]) setEventId(list[0].id);
    });
    api<{ quickRoles: Role[] }>('/api/v1/meta').then((r) => r.ok && setRoles([...r.data.quickRoles, { key: 'other', label: '其他' }]));
    const reg = new URLSearchParams(location.search).get('reg');
    if (reg) {
      api<{ registration: Record<string, unknown> }>(`/api/v1/staff/checkin/reg/${reg}`).then((r) => {
        if (!r.ok) return setErr(r.message);
        const x = r.data.registration as Record<string, string & number>;
        setEventId(x.event_id);
        setRegCard({ id: x.contact_id, member_no: x.member_no, name: x.name, email: x.email, phone_e164: x.phone_e164, role_label: x.role_label, reg_status: x.status, arrival_status: x.arrival_status, event_id: x.event_id, title: x.title, starts_at: x.starts_at, status: x.status });
      });
    }
  }, []);

  async function search() {
    if (!q.trim()) return;
    setErr('');
    const r = await api<{ people: Person[] }>(`/api/v1/staff/checkin/search?q=${encodeURIComponent(q)}&eventId=${eventId}`);
    if (r.ok) setPeople(r.data.people);
    else setErr(r.message);
  }
  async function checkin(p: Person) {
    setBusy(true);
    setErr('');
    const r = await api<{ result: Result }>('/api/v1/staff/checkin', { body: { eventId, contactId: p.id } });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setResult({ who: p.name, r: r.data.result });
    search();
  }
  async function register() {
    setBusy(true);
    setErr('');
    const r = await api<{ result: Result; created: boolean }>('/api/v1/staff/checkin', { body: { eventId, onsite: form } });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setResult({ who: form.name, r: r.data.result });
    setForm({ name: '', phone: '', email: '', roleSub: '' });
    setOnsite(false);
  }

  return (
    <StaffGate title="现场签到台" role="checkin">
      {() => (
        <>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ev">当前活动</label>
            <select id="ev" className={styles.select} value={eventId} onChange={(e) => { setEventId(e.target.value); setPeople(null); setResult(null); }}>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{fmtDateTime(e.starts_at)} {e.title}{e.fee_cents ? '（收费）' : ''}</option>
              ))}
            </select>
          </div>

          {result && (
            <div className={styles.card} onClick={() => setResult(null)}>
              <div className={styles.bigResult} style={{ padding: '1rem' }}>
                <div className={styles.bigIcon}>{ICON[result.r.kind] ?? 'ℹ️'}</div>
                <p className={styles.bigText}>{result.who}</p>
                <p style={{ fontSize: '1.25rem', margin: 0 }}>{result.r.message}</p>
                {result.r.kind === 'pending_payment' && (
                  <p className={styles.muted}>订单号 {result.r.orderNo}，请引导付款；财务核款后系统自动完成签到。</p>
                )}
              </div>
            </div>
          )}
          {err && <div className={styles.error}>{err}</div>}
          {regCard && (
            <div className={`${styles.card} ${styles.cardGold}`}>
              <p className={styles.small} style={{ margin: 0 }}>个人签到码 · {regCard.title}（{fmtDateTime(regCard.starts_at)}）</p>
              <p className={styles.bigText} style={{ margin: '0.4rem 0' }}>{regCard.name} <span className={styles.small}>#{regCard.member_no}</span></p>
              <p className={styles.small}>{[regCard.phone_e164, regCard.email, regCard.role_label].filter(Boolean).join(' · ')}</p>
              <p className={styles.small}>
                {regCard.arrival_status === 'checked_in' ? '已签到' : regCard.status === 'cancelled' ? '报名已取消' : regCard.status === 'waitlisted' ? '候补（到场可直接签到）' : '已报名，未签到'}
              </p>
              <div className={styles.btnRow}>
                <button className={styles.btn} disabled={busy || regCard.arrival_status === 'checked_in'} onClick={async () => { await checkin(regCard); setRegCard({ ...regCard, arrival_status: 'checked_in' }); }}>核对无误，签到</button>
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setRegCard(null)}>关闭</button>
              </div>
            </div>
          )}

          {!onsite && (
            <>
              <div className={styles.inputRow}>
                <input className={styles.input} placeholder="姓名 / 手机号 / 邮箱 / 会员编号" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
                <button className={styles.btn} onClick={search}>查找</button>
              </div>
              <ul className={styles.list}>
                {people?.map((p) => (
                  <li key={p.id} className={styles.listItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '1.15rem' }}>{p.name}</strong> <span className={styles.small}>#{p.member_no}</span>
                        <div className={styles.small}>{[p.phone_e164, p.email, p.role_label].filter(Boolean).join(' · ')}</div>
                        <div className={styles.small}>
                          {p.arrival_status === 'checked_in' ? '已签到' : p.arrival_status === 'arrived_pending_payment' ? '到场待核款' : p.reg_status === 'registered' ? '已报名，未签到' : p.reg_status === 'waitlisted' ? '候补' : '未报名本场'}
                        </div>
                      </div>
                      <button className={styles.btn} disabled={busy || !eventId} onClick={() => checkin(p)} style={{ flexShrink: 0 }}>
                        代签到
                      </button>
                    </div>
                  </li>
                ))}
                {people && !people.length && <p className={styles.muted}>没找到。可以换个关键词，或点下面“现场登记”。</p>}
              </ul>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnBlock}`} style={{ marginTop: '1rem' }} onClick={() => setOnsite(true)}>
                + 现场登记（新人，不会扫码 / 没手机）
              </button>
            </>
          )}

          {onsite && (
            <div className={styles.card}>
              <p className={styles.cardTitle}>现场登记</p>
              <p className={styles.small}>填三项即完成报名和签到。手机号或邮箱填一项即可。</p>
              {(['name', 'phone', 'email'] as const).map((k) => (
                <div className={styles.field} key={k}>
                  <label className={styles.label} htmlFor={`on-${k}`}>{{ name: '姓名 *', phone: '手机号', email: '邮箱' }[k]}</label>
                  <input id={`on-${k}`} className={styles.input} inputMode={k === 'phone' ? 'tel' : k === 'email' ? 'email' : 'text'} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              <div className={styles.field}>
                <span className={styles.label}>主要行业</span>
                <div className={styles.chips}>
                  {roles.map((r) => (
                    <button key={r.key} type="button" className={`${styles.chip} ${form.roleSub === r.key ? styles.chipOn : ''}`} onClick={() => setForm({ ...form, roleSub: r.key })}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btn} disabled={busy || !form.name || !(form.phone || form.email)} onClick={register}>
                  {busy ? '处理中…' : '登记并签到'}
                </button>
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setOnsite(false)}>返回查找</button>
              </div>
            </div>
          )}
        </>
      )}
    </StaffGate>
  );
}
