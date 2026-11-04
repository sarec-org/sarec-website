'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can } from '@/components/crm/staff/StaffGate';
import { useQr } from '@/components/crm/staff/QrCode';
import { api, copyText, fmtDateTime, money } from '@/components/crm/client';
import { EventForm } from '../EventForm';
import { checkinA4, registerPoster, saveBlob, type MaterialEvent } from '@/components/crm/staff/eventMaterials';

type Ev = Record<string, unknown> & { id: string; slug: string; title: string; checkin_secret: string; registration_open: boolean; is_listed: boolean; event_status: string; fee_cents: number };
type Reg = { contact_id: string; name: string; member_no: number; email: string | null; phone_e164: string | null; status: string; arrival_status: string; source: string; order_status: string | null };

export default function StaffEventDetail({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ event: Ev; registrations: Reg[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [origin, setOrigin] = useState('');
  const [making, setMaking] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ event: Ev; registrations: Reg[] }>(`/api/v1/staff/events/${params.id}`);
    if (r.ok) setData(r.data);
    else setMsg({ ok: false, text: r.message });
  }, [params.id]);
  useEffect(() => {
    setOrigin(location.origin);
    load();
  }, [load]);
  const link = data ? `${origin}/zh/checkin/${data.event.slug}?k=${data.event.checkin_secret}` : null;
  const qr = useQr(link, 900);

  async function patch(body: Record<string, unknown>, ok: string) {
    const r = await api(`/api/v1/staff/events/${params.id}`, { method: 'PATCH', body });
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.message });
    load();
  }
  // 下载物料：报名小程序码（微信接口，正式版）/ 海报版 / A4 签到码
  async function fetchCode(): Promise<Blob | null> {
    const res = await fetch(`/api/v1/staff/events/${params.id}/wxacode`, { credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
    if (res && res.ok && (res.headers.get('content-type') || '').startsWith('image/')) return res.blob();
    const j = (await res?.json().catch(() => null)) as { error?: { message?: string } } | null;
    setMsg({ ok: false, text: j?.error?.message || '生成小程序码失败，请稍后再试' });
    return null;
  }
  async function make(kind: 'code' | 'poster' | 'a4') {
    if (!data || making) return;
    const ev = data.event as unknown as MaterialEvent;
    setMaking(kind);
    setMsg(null);
    try {
      if (kind === 'a4') {
        if (!link) return;
        saveBlob(await checkinA4(ev, link), `签到码-A4-${ev.slug}.png`);
      } else {
        const code = await fetchCode();
        if (!code) return;
        if (kind === 'code') saveBlob(code, `报名小程序码-${ev.slug}.png`);
        else {
          const url = URL.createObjectURL(code);
          try { saveBlob(await registerPoster(ev, url), `报名海报-${ev.slug}.png`); } finally { URL.revokeObjectURL(url); }
        }
      }
      setMsg({ ok: true, text: '已开始下载' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : '生成失败，请稍后再试' });
    } finally {
      setMaking(null);
    }
  }
  async function regen() {
    const r = await api(`/api/v1/staff/events/${params.id}`, { body: { action: 'regenerate_code' } });
    setMsg(r.ok ? { ok: true, text: '已生成新签到码，旧码已失效，请重新打印' } : { ok: false, text: r.message });
    load();
  }

  if (full && data && qr) {
    return (
      <div onClick={() => setFull(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#0A1730', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', fontFamily: 'var(--serif-zh)', margin: '0 0 1rem' }}>扫码报名或签到</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="签到二维码" style={{ width: 'min(80vw, 70vh)', height: 'auto' }} />
        <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 2rem)', margin: '1rem 0 0' }}>{data.event.title}</p>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1.5rem' }}>点屏幕任意位置退出全屏</p>
      </div>
    );
  }

  return (
    <StaffGate title={data?.event.title ?? '活动详情'} role={['ops', 'checkin']}>
      {(s) =>
        data && (
          <>
            <Msg m={msg} />
            <div className={styles.card}>
              <div className={styles.row}><span className={styles.rowLabel}>时间</span><span className={styles.rowValue}>{fmtDateTime(String(data.event.starts_at))}</span></div>
              <div className={styles.row}><span className={styles.rowLabel}>费用</span><span className={styles.rowValue}>{data.event.fee_cents ? money(data.event.fee_cents) : '免费'}</span></div>
              <div className={styles.row}><span className={styles.rowLabel}>报名页</span><span className={`${styles.rowValue} ${styles.mono}`}>/zh/e/{data.event.slug}</span></div>
              <div className={styles.row}><span className={styles.rowLabel}>公开</span><span className={styles.rowValue}>{data.event.is_listed ? '公开（出现在活动列表）' : '不公开（只凭链接或二维码进入）'}</span></div>
              <div className={styles.row}><span className={styles.rowLabel}>报名</span><span className={styles.rowValue}>{data.event.registration_open ? '开放中' : '已关闭'}</span></div>
            </div>

            <h2 className={styles.h2}>签到二维码</h2>
            <div className={styles.card} style={{ textAlign: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="签到二维码" className={styles.qrImg} />}
              <p className={styles.small}>放在数字人竖屏右上角，或打印贴在门口。</p>
              <div className={styles.btnRow}>
                {qr && (
                  <a className={styles.btn} href={qr} download={`checkin-${data.event.slug}.png`}>
                    下载打印
                  </a>
                )}
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setFull(true)}>
                  全屏显示
                </button>
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={async () => link && setMsg({ ok: await copyText(link), text: '签到链接已复制' })}>
                  复制链接
                </button>
              </div>
              {can(s, 'ops') && (
                <button className={`${styles.btn} ${styles.btnDanger}`} style={{ marginTop: '0.75rem' }} onClick={regen}>
                  作废旧码，重新生成
                </button>
              )}
            </div>

            <h2 className={styles.h2}>下载物料</h2>
            <div className={styles.card}>
              <p className={styles.small}>报名码扫码直接进本场活动报名页（正式版小程序）；海报竖版适合发朋友圈和微信群；A4 签到码打印贴在门口。重新生成签到码后，A4 需重新下载打印。</p>
              <div className={styles.btnRow}>
                <button className={styles.btn} disabled={!!making} onClick={() => make('code')}>
                  {making === 'code' ? '生成中…' : '下载小程序报名码'}
                </button>
                <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!making} onClick={() => make('poster')}>
                  {making === 'poster' ? '生成中…' : '下载海报版报名码'}
                </button>
                <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!making || !link} onClick={() => make('a4')}>
                  {making === 'a4' ? '生成中…' : '下载 A4 打印版签到码'}
                </button>
              </div>
            </div>

            {can(s, 'ops') && (
              <>
                <h2 className={styles.h2}>管理</h2>
                <div className={styles.btnRow}>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setEditing((x) => !x)}>
                    {editing ? '收起编辑' : '编辑活动'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => patch({ registrationOpen: !data.event.registration_open }, data.event.registration_open ? '已关闭报名' : '已重新开放报名')}>
                    {data.event.registration_open ? '关闭报名' : '重新开放报名'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => patch({ listed: !data.event.is_listed }, data.event.is_listed ? '已设为不公开（凭链接或二维码仍可报名）' : '已公开')}>
                    {data.event.is_listed ? '设为不公开' : '设为公开'}
                  </button>
                  {data.event.event_status === 'scheduled' && (
                    <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => patch({ eventStatus: 'completed' }, '已标记为已结束')}>
                      标记已结束
                    </button>
                  )}
                  {data.event.event_status === 'scheduled' && (
                    <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => patch({ eventStatus: 'cancelled' }, '活动已取消')}>
                      取消活动
                    </button>
                  )}
                </div>
                {editing && (
                  <div style={{ marginTop: '1rem' }}>
                    <EventForm initial={data.event} onSaved={() => { setEditing(false); setMsg({ ok: true, text: '已保存' }); load(); }} />
                  </div>
                )}
              </>
            )}

            <h2 className={styles.h2}>报名名单（{data.registrations.length}）</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead><tr><th>姓名</th><th>联系方式</th><th>报名</th><th>到场</th><th>付款</th></tr></thead>
                <tbody>
                  {data.registrations.map((r) => (
                    <tr key={r.contact_id}>
                      <td><a href={`/zh/staff/contacts/${r.contact_id}`} style={{ color: 'var(--gold)' }}>{r.name}</a> <span className={styles.small}>#{r.member_no}</span></td>
                      <td className={styles.small}>{r.phone_e164 ?? r.email}</td>
                      <td>{({ registered: '已报名', waitlisted: '候补', cancelled: '已取消' } as Record<string, string>)[r.status]}{r.source !== 'online' ? `（${r.source === 'onsite' ? '现场' : '工作人员'}）` : ''}</td>
                      <td>{({ none: '—', checked_in: '已签到', arrived_pending_payment: '到场待核款' } as Record<string, string>)[r.arrival_status]}</td>
                      <td>{r.order_status ? ({ pending_payment: '待付款', payment_submitted: '待核款', paid: '已付款' } as Record<string, string>)[r.order_status] ?? r.order_status : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      }
    </StaffGate>
  );
}
