'use client';
/**
 * 报名成功页：第一屏报名凭证 + 一键加入日历 / 一键导航 / 一键取消；
 * 然后“用一句话介绍自己”，再往下一屏一题选填。收费活动先付款，付款提交后才出选填题。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, fmtDateTime, money } from './client';
import { EventEssentials } from './EventRegister';
import { ProfileFlow } from './ProfileFlow';
import s from './crm.module.css';

type Reg = { slug: string; title: string; status: string; arrival_status: string; order_no: string | null; order_status: string | null; fee_cents: number };
type Me = { contact: { name: string; member_no: number }; registrations: Reg[]; contactInfo?: { phone: { masked: string } | null; email: { masked: string; status: string } | null } };
type Ev = { event: Parameters<typeof EventEssentials>[0]['e'] };

function mapsUrl(q: string): string {
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad|Mac/i.test(navigator.userAgent);
  return ios ? `https://maps.apple.com/?q=${encodeURIComponent(q)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** 个人签到码（工作人员扫码核验） */
function PersonalQr({ slug }: { slug: string }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    api<{ qr: string }>(`/api/v1/me/checkin-qr?slug=${encodeURIComponent(slug)}`).then((r) => r.ok && setQr(r.data.qr));
  }, [slug]);
  if (!qr) return null;
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: '0.75rem' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="我的签到码" style={{ width: 120, height: 120, background: 'var(--ivory)', padding: 4 }} />
      <p className={s.small} style={{ margin: 0 }}>我的签到码：到场出示给工作人员即可。</p>
    </div>
  );
}

export function RegisterDone({ slug, taskId, msg }: { slug: string; taskId: string | null; msg: string | null }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ev, setEv] = useState<Ev | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api<Me>('/api/v1/me'), api<Ev>(`/api/v1/events/${encodeURIComponent(slug)}`)]);
    if (!a.ok) return setErr(a.status === 401 ? '请先登录查看报名凭证' : a.message);
    if (!b.ok) return setErr(b.message);
    setMe(a.data);
    setEv(b.data);
  }, [slug]);
  useEffect(() => {
    load();
  }, [load]);

  if (err) return <div className={s.page}><Link href={`/zh/e/${slug}`} className={s.back}>‹ 返回活动</Link><p className={s.error}>{err}</p>{err.includes('登录') && <Link className={s.btn} href={`/zh/signin?next=/zh/e/${slug}/done`}>去登录</Link>}</div>;
  if (!me || !ev) return <div className={s.page}><p className={s.small}>加载中…</p></div>;
  const reg = me.registrations.find((r) => r.slug === slug);
  const e = ev.event;
  if (!reg) return <div className={s.page}><Link href={`/zh/e/${slug}`} className={s.back}>‹ 返回活动</Link><p className={s.notice}>还没有报名这场活动。</p><Link className={s.btn} href={`/zh/e/${slug}`}>去报名</Link></div>;

  const cancelled = reg.status === 'cancelled';
  const checkedIn = !cancelled && reg.arrival_status === 'checked_in';
  const payFirst = reg.order_no && reg.order_status === 'pending_payment';
  const feePending = !cancelled && !checkedIn && !!reg.order_no && (reg.order_status === 'pending_payment' || reg.order_status === 'payment_submitted');
  const waitlisted = !cancelled && reg.status === 'waitlisted';
  const where = [e.locationName, e.address].filter(Boolean).join(' ');

  async function cancel() {
    setBusy(true);
    const r = await api(`/api/v1/events/${encodeURIComponent(slug)}/cancel`, { method: 'POST' });
    setBusy(false);
    setConfirmCancel(false);
    if (!r.ok) return setErr(r.message);
    load();
  }

  return (
    <div className={s.page}>
      <Link href="/zh/me" className={s.back}>‹ 我的</Link>
      <p className={s.eyebrow}>{cancelled ? 'CANCELLED · 已取消' : checkedIn ? 'CHECKED IN · 已签到' : waitlisted ? 'WAITLIST · 候补' : feePending ? 'PENDING · 收费待确认' : 'REGISTERED · 报名成功'}</p>
      <h1 className={s.h1}>{cancelled ? '报名已取消' : checkedIn ? '已签到，欢迎光临' : waitlisted ? '已进入候补名单' : feePending ? (reg.order_status === 'payment_submitted' ? '付款已提交，待核款' : '报名已提交，费用待确认') : '报名成功'}</h1>
      {waitlisted && <p className={s.notice}>目前名额已满。有人取消时按报名顺序递补，递补成功后这里会变成“报名成功”。</p>}
      {feePending && reg.order_status === 'pending_payment' && <p className={s.notice}>付款提交、工作人员核款后，名额才算确认。</p>}

      <div className={`${s.card} ${s.cardGold}`}>
        <p className={s.cardTitle}>{e.title}</p>
        <div className={s.row}><span className={s.rowLabel}>姓名</span><span className={s.rowValue}>{me.contact.name}</span></div>
        <div className={s.row}><span className={s.rowLabel}>编号</span><span className={`${s.rowValue} ${s.mono}`}>No. {me.contact.member_no}</span></div>
        <div className={s.row}><span className={s.rowLabel}>时间</span><span className={s.rowValue}>{fmtDateTime(e.startsAt, e.timezone)}</span></div>
        {where && <div className={s.row}><span className={s.rowLabel}>地点</span><span className={s.rowValue}>{where}</span></div>}
        {reg.order_no && (
          <div className={s.row}><span className={s.rowLabel}>费用</span><span className={s.rowValue}>{money(reg.fee_cents)} · {reg.order_status === 'paid' ? '已付款' : reg.order_status === 'payment_submitted' ? '待核款' : '待付款'}</span></div>
        )}
        {!cancelled && !checkedIn && !waitlisted && (
          <>
            <p className={s.small} style={{ marginTop: '0.5rem' }}>到场请用微信扫一扫，扫门口的活动码；或出示下面的个人签到码，由工作人员核验。</p>
            <PersonalQr slug={slug} />
          </>
        )}
      </div>

      {!cancelled && me.contactInfo && (me.contactInfo.phone || me.contactInfo.email) && (
        <p className={s.notice}>
          活动通知将发送到：{[me.contactInfo.phone && `手机 ${me.contactInfo.phone.masked}`, me.contactInfo.email && `邮箱 ${me.contactInfo.email.masked}`].filter(Boolean).join('、')}
          {me.contactInfo.email?.status === 'unconfirmed' ? '（请到邮箱点“确认邮箱”）' : ''}。
          有变化？<Link href="/zh/me" style={{ color: 'var(--gold)' }}>点这里修改 ›</Link>
        </p>
      )}

      {!cancelled && (
        <div className={s.btnRow} style={{ marginBottom: '1rem' }}>
          {!waitlisted && <a className={`${s.btn} ${s.btnGhost}`} href={`/api/v1/events/${encodeURIComponent(slug)}/ics`}>加入日历</a>}
          {where && !waitlisted && <a className={`${s.btn} ${s.btnGhost}`} href={mapsUrl(where)} target="_blank" rel="noopener noreferrer">导航</a>}
          {reg.arrival_status === 'none' &&
            (confirmCancel ? (
              <button className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={cancel}>{busy ? '处理中…' : '确定取消'}</button>
            ) : (
              <button className={`${s.btn} ${s.btnQuiet}`} onClick={() => setConfirmCancel(true)}>{waitlisted ? '退出候补' : '取消报名'}</button>
            ))}
        </div>
      )}
      {cancelled && <Link className={`${s.btn} ${s.btnBlock}`} href={`/zh/e/${slug}`}>重新报名</Link>}

      {!cancelled && payFirst && (
        <div className={s.card}>
          <p className={s.cardTitle}>还差一步：付款</p>
          <p className={s.muted}>付款提交后名额才算确认。Zelle 或银行卡都可以。</p>
          <Link className={`${s.btn} ${s.btnBlock}`} href={`/zh/pay/${reg.order_no}`}>去付款 {money(reg.fee_cents)}</Link>
        </div>
      )}

      {!cancelled && !payFirst && reg.status === 'registered' && (
        <>
          <h2 className={s.h2}>顺手完善资料</h2>
          <ProfileFlow taskId={taskId} eventSlug={slug} intro={msg} doneHref="/zh/me" doneLabel="完成，去我的" />
        </>
      )}
    </div>
  );
}
