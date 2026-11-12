'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can } from '@/components/crm/staff/StaffGate';
import { useQr } from '@/components/crm/staff/QrCode';
import { api, copyText, fmtDateTime, money } from '@/components/crm/client';
import { EventForm } from '../EventForm';
import { checkinA4, registerPoster, saveBlob, type MaterialEvent } from '@/components/crm/staff/eventMaterials';
import { AiPoster } from '@/components/crm/staff/AiPoster';

type Ev = Record<string, unknown> & { id: string; slug: string; title: string; checkin_secret: string; registration_open: boolean; is_listed: boolean; event_status: string; fee_cents: number };
type Reg = { contact_id: string; name: string; member_no: number; email: string | null; phone_e164: string | null; status: string; arrival_status: string; source: string; order_status: string | null; paid_when?: string | null; pay_link?: string | null; added_by_name?: string | null; is_placeholder?: boolean };

export default function StaffEventDetail({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ event: Ev; registrations: Reg[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  // 1.3：门口签到码统一用小程序码（微信扫一扫直接进小程序签到）；网页链接码只作应急，收在下面
  const [mpCode, setMpCode] = useState<string | null>(null);
  const [mpCodeErr, setMpCodeErr] = useState<string | null>(null);
  const [showWeb, setShowWeb] = useState(false);
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
  const secret = data?.event.checkin_secret;
  const loadMpCode = useCallback(async () => {
    setMpCodeErr(null);
    const res = await fetch(`/api/v1/staff/events/${params.id}/wxacode?kind=checkin`, { credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
    if (res && res.ok && (res.headers.get('content-type') || '').startsWith('image/')) {
      const url = URL.createObjectURL(await res.blob());
      setMpCode((old) => { if (old) URL.revokeObjectURL(old); return url; });
      return;
    }
    const j = (await res?.json().catch(() => null)) as { error?: { message?: string } } | null;
    setMpCode(null);
    setMpCodeErr(j?.error?.message || '签到小程序码这会儿生成不了（微信接口没响应）');
  }, [params.id]);
  useEffect(() => {
    if (secret) loadMpCode();
  }, [secret, loadMpCode]);
  const qr = useQr(link, 900);

  async function patch(body: Record<string, unknown>, ok: string) {
    const r = await api(`/api/v1/staff/events/${params.id}`, { method: 'PATCH', body });
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.message });
    load();
  }
  // 下载物料：报名小程序码（微信接口，正式版）/ 海报版 / A4 签到码
  async function fetchCode(kind: 'register' | 'checkin' = 'register', quiet = false): Promise<Blob | null> {
    const q = kind === 'checkin' ? '?kind=checkin' : '';
    const res = await fetch(`/api/v1/staff/events/${params.id}/wxacode${q}`, { credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
    if (res && res.ok && (res.headers.get('content-type') || '').startsWith('image/')) return res.blob();
    const j = (await res?.json().catch(() => null)) as { error?: { message?: string } } | null;
    if (!quiet) setMsg({ ok: false, text: j?.error?.message || '生成小程序码失败，请稍后再试' });
    return null;
  }
  async function make(kind: 'code' | 'poster' | 'a4' | 'a4web') {
    if (!data || making) return;
    const ev = data.event as unknown as MaterialEvent;
    setMaking(kind);
    setMsg(null);
    try {
      if (kind === 'a4') {
        // 只用签到小程序码（微信扫一扫直接进小程序，按微信身份认人）。生成不了就明说，不悄悄换成网页码
        const code = await fetchCode('checkin', true);
        if (!code) {
          setMsg({ ok: false, text: '签到小程序码这会儿生成不了（微信接口没响应）。请过 1 分钟再点一次；急用时可展开下面的“应急：网页版签到码”。' });
          return;
        }
        const url = URL.createObjectURL(code);
        try {
          saveBlob(await checkinA4(ev, { codeSrc: url }), `门口签到码-A4-${ev.slug}.png`);
        } finally {
          URL.revokeObjectURL(url);
        }
      } else if (kind === 'a4web') {
        if (!link) return;
        saveBlob(await checkinA4(ev, { url: link }), `网页版签到码-A4-${ev.slug}.png`);
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

  if (full && data && (mpCode || qr)) {
    return (
      <div onClick={() => setFull(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#0A1730', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', fontFamily: 'var(--serif-zh)', margin: '0 0 1rem' }}>打开微信「扫一扫」，扫码签到</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={(showWeb ? qr : mpCode) || qr || ''} alt="签到码" style={{ width: 'min(80vw, 62vh)', height: 'auto' }} />
        <p style={{ fontSize: 'clamp(1rem, 2.2vw, 1.6rem)', margin: '1rem 0 0' }}>已报名：扫完自动签到 · 没报名：填姓名、手机两项</p>
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

            <h2 className={styles.h2}>门口签到码</h2>
            <div className={styles.card} style={{ textAlign: 'center' }}>
              {mpCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mpCode} alt="门口签到码（小程序码）" className={styles.qrImg} />
              ) : (
                <p className={mpCodeErr ? styles.error : styles.small}>{mpCodeErr ? `${mpCodeErr}。` : '正在生成签到码…'}</p>
              )}
              <p className={styles.small}>打印 A4 贴在门口，或全屏放在平板上。客人用微信「扫一扫」扫码：已报名的自动签到，没报名的填姓名、手机两项。</p>
              <div className={styles.btnRow}>
                <button className={styles.btn} disabled={!!making || !mpCode} onClick={() => make('a4')}>
                  {making === 'a4' ? '生成中…' : '下载 A4 门口签到码'}
                </button>
                <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!mpCode} onClick={() => { setShowWeb(false); setFull(true); }}>
                  全屏显示
                </button>
                {mpCodeErr && (
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={loadMpCode}>
                    再试一次
                  </button>
                )}
              </div>
              {can(s, 'ops') && (
                <button className={`${styles.btn} ${styles.btnDanger}`} style={{ marginTop: '0.75rem' }} onClick={regen}>
                  作废旧码，重新生成
                </button>
              )}
              <details style={{ marginTop: '1rem', textAlign: 'left' }} open={showWeb} onToggle={(e) => setShowWeb((e.target as HTMLDetailsElement).open)}>
                <summary className={styles.small} style={{ cursor: 'pointer' }}>应急：网页版签到码（只在小程序码生成不了时用）</summary>
                <p className={styles.small}>网页版用微信扫会打开网页（不是小程序），客人要填姓名、手机两项才能签到。</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr && <img src={qr} alt="网页版签到码" className={styles.qrImg} style={{ maxWidth: 220 }} />}
                <div className={styles.btnRow}>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={!!making || !link} onClick={() => make('a4web')}>
                    {making === 'a4web' ? '生成中…' : '下载网页版 A4'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={async () => link && setMsg({ ok: await copyText(link), text: '签到链接已复制' })}>
                    复制链接
                  </button>
                </div>
              </details>
            </div>

            <h2 className={styles.h2}>活动物料</h2>
            <div className={styles.card}>
              <p className={styles.small}>报名码：扫码直接进本场活动报名页（正式版小程序）；海报竖版适合发朋友圈和微信群。<strong>报名码不能签到</strong>，门口请贴上面的签到码。</p>
              <div className={styles.btnRow}>
                <button className={styles.btn} disabled={!!making} onClick={() => make('code')}>
                  {making === 'code' ? '生成中…' : '下载小程序报名码'}
                </button>
                <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!making} onClick={() => make('poster')}>
                  {making === 'poster' ? '生成中…' : '下载海报版报名码'}
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
                {/* 补充 3：保存后自动出 3 款海报，一键下载；改了标题 / 时间 / 封面会自动更新 */}
                <div className={styles.card} style={{ marginTop: '1rem' }}>
                  <p className={styles.cardTitle}>活动海报（自动生成，直接用；设了「官方海报」就用官方海报的图和字）</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {([['moments', '朋友圈竖版', 120], ['square', '群聊方版', 160], ['oa', '公众号横版', 240]] as const).map(([k, label, w]) => (
                      <a key={k} href={`/api/v1/staff/events/${params.id}/poster?size=${k}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/v1/staff/events/${params.id}/poster?size=${k}&inline=1&v=${encodeURIComponent(String(data.event.updated_at ?? ''))}`} alt={label} width={w} style={{ borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} loading="lazy" />
                        <span className={styles.small}>下载 · {label}</span>
                      </a>
                    ))}
                  </div>
                  <p className={styles.small}>没传封面时用这个活动类型的默认图。海报上没有金额，也不写已报人数。</p>
                </div>
                {/* 东哥 11/10：AI 海报（只在网站后台生成和下载，不进小程序） */}
                <AiPoster eventId={params.id} isAdmin={can(s, 'admin')} />
              </>
            )}

            <h2 className={styles.h2}>报名名单（{data.registrations.length}）</h2>
            {Number(data.event.fee_cents) > 0 && (() => {
              const live = data.registrations.filter((r) => r.status !== 'cancelled');
              const paid = live.filter((r) => r.order_status === 'paid' && r.paid_when !== 'onsite').length;
              const onsite = live.filter((r) => r.order_status === 'paid' && r.paid_when === 'onsite').length;
              const unpaid = live.length - paid - onsite;
              return <p className={styles.notice}>收费：已付 <strong>{paid}</strong> · 未付 <strong>{unpaid}</strong> · 现场付 <strong>{onsite}</strong>。没付的，系统已在报名后、活动前 5 天各发过一次付款链接；到场没付的签到台现场 Zelle 扫码。</p>;
            })()}
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead><tr><th>姓名</th><th>联系方式</th><th>报名</th><th>到场</th><th>付款</th></tr></thead>
                <tbody>
                  {data.registrations.map((r) => (
                    <tr key={r.contact_id}>
                      <td><a href={`/zh/staff/contacts/${r.contact_id}`} style={{ color: 'var(--gold)' }}>{r.name}</a> <span className={styles.small}>#{r.member_no}</span></td>
                      <td className={styles.small}>{r.phone_e164 ?? r.email}</td>
                      <td>{({ registered: '已报名', waitlisted: '候补', cancelled: '已取消' } as Record<string, string>)[r.status]}{r.source === 'companion' ? `（由 ${r.added_by_name ?? '朋友'} 代报名${r.is_placeholder ? '，本人还没登录过' : ''}）` : r.source !== 'online' ? `（${r.source === 'onsite' ? '现场' : '工作人员'}）` : ''}</td>
                      <td>{({ none: '—', checked_in: '已签到', arrived_pending_payment: '到场待核款' } as Record<string, string>)[r.arrival_status]}</td>
                      <td>{r.order_status ? (r.order_status === 'paid' ? (r.paid_when === 'onsite' ? '现场付' : '已付') : ({ pending_payment: '未付', payment_submitted: '已提交，待核款' } as Record<string, string>)[r.order_status] ?? r.order_status) : '—'}
                        {r.pay_link && (
                          <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ marginLeft: 6, padding: '2px 8px' }} onClick={async () => setMsg({ ok: await copyText(r.pay_link!), text: `${r.name} 的付款链接已复制，可以直接发给本人` })}>
                            复制付款链接
                          </button>
                        )}
                      </td>
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
