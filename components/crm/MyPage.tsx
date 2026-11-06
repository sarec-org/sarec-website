'use client';
/**
 * 我的：会员卡简版（注册用户不发正式卡）、积分、资料完成度、我的报名、订单与付款、会议室预约。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate, fmtDateTime, money } from './client';
import { LoginBox } from './LoginBox';
import { ContactInfoCard, type ContactInfo } from './ContactInfo';
import s from './crm.module.css';

type Me = {
  contact: { name: string; member_no: number; email: string | null; phone_e164: string | null; role_label: string | null };
  contactInfo: ContactInfo;
  member: { isMember: boolean; tierName: string | null; startDate: string | null; endDate: string | null; paymentPending: boolean; expired: boolean };
  membershipPending: { orderNo: string; description: string | null } | null;
  points: { balance: number; ledger: { category: string; points: number; reason: string | null; created_at: string }[] };
  profile: { done: number; total: number };
  registrations: { slug: string; title: string; starts_at: string; status: string; arrival_status: string; order_no: string | null; order_status: string | null }[];
  orders: { order_no: string; purpose_label: string; description: string | null; amount_cents: number; status: string; status_label: string; created_at: string }[];
  bookings: { id: string; room: string; starts_at: string; ends_at: string; status: string; order_no: string | null; order_status: string | null }[];
  passes: { month_start: string; status: string }[];
};

const TABS = ['报名', '订单', '积分', '会议室'] as const;
const CAT: Record<string, string> = { profile: '资料完善', signup: '注册', checkin: '活动签到', referral: '推荐', feedback: '反馈', redeem: '积分抵扣', adjust: '调整' };

/** 我的推荐：只显示三个数字（不含被邀请人信息、不含任何奖励规则） */
function MyReferrals() {
  const [r, setR] = useState<{ invited: number; arrived: number; joined: number } | null>(null);
  useEffect(() => {
    api<{ invited: number; arrived: number; joined: number }>('/api/v1/me/referrals').then((x) => x.ok && setR(x.data));
  }, []);
  if (!r) return null;
  return (
    <div className={s.card}>
      <p className={s.small} style={{ margin: '0 0 0.5rem' }}>我的推荐</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
        {([['已邀请', r.invited], ['已到场', r.arrived], ['已入会', r.joined]] as const).map(([l, n]) => (
          <div key={l}><p className={s.cardTitle} style={{ margin: 0, color: 'var(--gold)' }}>{n}</p><p className={s.small} style={{ margin: 0 }}>{l}</p></div>
        ))}
      </div>
    </div>
  );
}

export function MyPage() {
  const [d, setD] = useState<Me | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('报名');
  const [lastOrder, setLastOrder] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<Me>('/api/v1/me');
    if (!r.ok) return r.status === 401 ? setNeedLogin(true) : setErr(r.message);
    setNeedLogin(false);
    setD(r.data);
    try {
      const lo = localStorage.getItem('sarec:lastOrder');
      setLastOrder(lo && r.data.orders.some((o) => o.order_no === lo && o.status === 'pending_payment') ? lo : null);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function cancelBooking(id: string) {
    const r = await api<{ message: string }>(`/api/v1/rooms/bookings/${id}/cancel`, { method: 'POST' });
    if (!r.ok) return setErr(r.message);
    load();
  }
  async function logout() {
    await api('/api/v1/auth/logout', { method: 'POST' });
    setD(null);
    setNeedLogin(true);
  }

  if (needLogin) {
    return (
      <div className={s.page}>
        <Link href="/zh" className={s.back}>‹ 返回首页</Link>
        <p className={s.eyebrow}>MY SAREC · 我的</p>
        <h1 className={s.h1}>登录查看我的报名、会员身份与积分</h1>
        <LoginBox onDone={load} />
      </div>
    );
  }
  if (err && !d) return <div className={s.page}><p className={s.error}>{err}</p></div>;
  if (!d) return <div className={s.page}><p className={s.small}>加载中…</p></div>;
  const m = d.member;

  return (
    <div className={s.page}>
      <Link href="/zh" className={s.back}>‹ 返回首页</Link>
      <p className={s.eyebrow}>MY SAREC · 我的</p>
      {lastOrder && (
        <p className={s.notice}>
          您有一笔待付款订单 <span className={s.mono}>{lastOrder}</span>。<Link href={`/zh/pay/${lastOrder}`} style={{ color: 'var(--gold)' }}>继续付款 ›</Link>
        </p>
      )}
      {err && <p className={s.error}>{err}</p>}

      {/* 联系方式：常驻顶部；退信 / 短信失败标红；满 6 个月再确认 */}
      <ContactInfoCard info={d.contactInfo} onChange={(ci) => setD({ ...d, contactInfo: ci })} />

      {/* 会员卡简版 */}
      <div className={`${s.card} ${m.isMember ? s.cardGold : ''}`} style={m.isMember ? { background: 'linear-gradient(135deg, rgba(201,165,103,0.16), rgba(10,23,48,0.6))' } : undefined}>
        <p className={s.small} style={{ letterSpacing: '0.12em' }}>SINO-AMERICAN REAL ESTATE CHAMBER</p>
        <p className={s.cardTitle} style={{ fontSize: '1.5rem', margin: '0.4rem 0' }}>{d.contact.name}</p>
        <div className={s.row}><span className={s.rowLabel}>编号</span><span className={`${s.rowValue} ${s.mono}`}>No. {d.contact.member_no}</span></div>
        <div className={s.row}><span className={s.rowLabel}>身份</span><span className={s.rowValue}>{m.isMember ? <b style={{ color: 'var(--gold-bright)' }}>{m.tierName}</b> : m.expired ? `会籍已到期（${m.tierName}）` : '注册用户'}</span></div>
        {m.isMember && m.endDate && <div className={s.row}><span className={s.rowLabel}>有效期至</span><span className={s.rowValue}>{fmtDate(m.endDate + 'T12:00:00')}</span></div>}
        {d.membershipPending && (
          <p className={s.notice} style={{ marginTop: '0.75rem' }}>
            {d.membershipPending.description ?? '会费'}：已提交，待确认到账（通常 1 个工作日内）。确认后自动成为正式会员。
          </p>
        )}
        {!m.isMember && !d.membershipPending && (
          <Link className={`${s.btn} ${s.btnGhost} ${s.btnBlock}`} style={{ marginTop: '0.75rem' }} href="/zh/join">
            {m.expired ? '续费会员' : '成为正式会员'}
          </Link>
        )}
        {m.isMember && <Link className={s.back} style={{ color: 'var(--gold)' }} href="/zh/join">续费 / 升级 ›</Link>}
      </div>

      <div className={s.grid2}>
        <Link href="/zh/me/profile" className={s.card} style={{ textDecoration: 'none', color: 'inherit' }}>
          <p className={s.small}>我的资料</p>
          <p className={s.cardTitle}>{d.profile.done}/{d.profile.total} 项</p>
          <div className={s.progress}><div className={s.progressBar} style={{ width: `${Math.round((d.profile.done / Math.max(1, d.profile.total)) * 100)}%` }} /></div>
          <p className={s.small}>继续完善 ›</p>
        </Link>
        <button type="button" className={s.card} style={{ textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => setTab('积分')}>
          <p className={s.small}>积分余额</p>
          <p className={s.cardTitle}>{d.points.balance}</p>
          <p className={s.small}>查看明细 ›</p>
        </button>
      </div>

      <MyReferrals />
      <div className={s.btnRow} style={{ margin: '0 0 1rem' }}>
        <Link className={`${s.btn} ${s.btnGhost}`} href="/zh/me/card">我的名片</Link>
        <Link className={`${s.btn} ${s.btnQuiet}`} href="/zh/events">找活动</Link>
        <Link className={`${s.btn} ${s.btnQuiet}`} href="/zh/rooms">预约会议室</Link>
        <Link className={`${s.btn} ${s.btnQuiet}`} href="/zh/benefits">会员权益</Link>
      </div>

      <div className={s.tabs} role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`${s.tab} ${tab === t ? s.tabOn : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === '报名' && (
        <ul className={s.list}>
          {d.registrations.length === 0 && <li className={s.muted}>还没有报名。<Link href="/zh/events">看看近期活动 ›</Link></li>}
          {d.registrations.map((r) => (
            <li key={r.slug}>
              <Link className={s.listItem} href={`/zh/e/${r.slug}/done`}>
                <b>{r.title}</b>
                <div className={s.small}>
                  {fmtDateTime(r.starts_at)} · {r.status === 'cancelled' ? '已取消' : r.status === 'waitlisted' ? '候补' : r.arrival_status === 'checked_in' ? '已到场' : r.arrival_status === 'arrived_pending_payment' ? '到场待核款' : '已报名'}
                  {r.order_status === 'pending_payment' ? ' · 待付款' : r.order_status === 'payment_submitted' ? ' · 待核款' : ''}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {tab === '订单' && (
        <ul className={s.list}>
          {d.orders.length === 0 && <li className={s.muted}>暂无订单</li>}
          {d.orders.map((o) => (
            <li key={o.order_no}>
              <Link className={s.listItem} href={`/zh/pay/${o.order_no}`}>
                <b>{o.description ?? o.purpose_label}</b> <span className={`${s.badge} ${o.status === 'paid' ? s.badgeGreen : o.status === 'cancelled' ? s.badgeMuted : ''}`}>{o.status_label}</span>
                <div className={s.small}><span className={s.mono}>{o.order_no}</span> · {money(o.amount_cents)} · {fmtDate(o.created_at)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {tab === '积分' && (
        <>
          <p className={s.small}>积分只奖励真实注册、报名、到场、入会和完善资料。续费会费时可抵扣，最多抵一半。</p>
          <ul className={s.list}>
            {d.points.ledger.length === 0 && <li className={s.muted}>暂无积分记录。完善资料、参加活动签到都能得积分。</li>}
            {d.points.ledger.map((p, i) => (
              <li key={i} className={s.listItem}>
                <span style={{ color: p.points >= 0 ? 'var(--gold-bright)' : '#f3c9c9' }} className={s.mono}>{p.points > 0 ? `+${p.points}` : p.points}</span> {CAT[p.category] ?? p.category}
                <div className={s.small}>{p.reason} · {fmtDate(p.created_at)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === '会议室' && (
        <ul className={s.list}>
          {d.passes.map((p) => <li key={p.month_start} className={s.listItem}>会场月卡 {p.month_start.slice(0, 7)} <span className={s.badge}>{p.status === 'active' ? '有效' : p.status === 'pending' ? '待付款' : '已取消'}</span></li>)}
          {d.bookings.length === 0 && d.passes.length === 0 && <li className={s.muted}>暂无预约。<Link href="/zh/rooms">预约会议室 ›</Link></li>}
          {d.bookings.map((b) => (
            <li key={b.id} className={s.listItem}>
              <b>{b.room}</b> <span className={`${s.badge} ${b.status === 'confirmed' ? s.badgeGreen : b.status === 'cancelled' ? s.badgeMuted : ''}`}>{b.status === 'confirmed' ? '已确认' : b.status === 'held' ? '待付款' : '已取消'}</span>
              <div className={s.small}>{fmtDateTime(b.starts_at)} – {new Date(b.ends_at).toLocaleTimeString('zh-CN', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false })}</div>
              {b.status !== 'cancelled' && new Date(b.starts_at) > new Date() && (
                <div className={s.btnRow} style={{ marginTop: '0.4rem' }}>
                  {b.status === 'held' && b.order_no && <Link className={`${s.btn} ${s.btnGhost}`} href={`/zh/pay/${b.order_no}`}>付款</Link>}
                  <button className={`${s.btn} ${s.btnQuiet}`} onClick={() => cancelBooking(b.id)}>取消预约</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: '2rem' }}>
        <p className={s.small}>登录身份：{d.contact.email ?? d.contact.phone_e164}{d.contact.role_label ? ` · ${d.contact.role_label}` : ''}</p>
        <p className={s.small}>语言：中文（English 即将上线）</p>
        <button className={`${s.btn} ${s.btnQuiet}`} onClick={logout}>退出登录</button>
      </div>
    </div>
  );
}
