'use client';
/**
 * 付款页 /zh/pay/[orderNo]：会费、活动费、会议室、月卡、电子屏共用。
 * Zelle（主）：二维码 + 收款人名字；醒目提示“请用银行 App 扫码付款，备注填订单号”（收款手机号收不到钱，已隐藏）。
 * 银行卡（Stripe）：给没有美国银行账户的会员。
 * 从银行 App 返回时自动回到本订单（地址不变；“我的”也会提示继续付款）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, copyText, fmtDateTime, money } from './client';
import { LoginBox } from './LoginBox';
import s from './crm.module.css';

type Data = {
  order: {
    orderNo: string; purpose: string; purposeLabel: string; description: string | null; amountCents: number; grossCents: number; pointsRedeemed: number;
    status: 'pending_payment' | 'payment_submitted' | 'paid' | 'cancelled' | 'refunded'; statusLabel: string; provider: string; payerNote: string | null;
    submittedAt: string | null; paidAt: string | null; rejectReason: string | null; relatedId: string | null;
  };
  zelle: { enabled: boolean; name: string | null; id: string | null; qrUrl: string; configured: boolean };
  stripe: { available: boolean };
};

function CopyRow({ label, value, mono = true }: { label: string; value: string | null; mono?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className={s.copyRow}>
      <div>
        <div className={s.small}>{label}</div>
        <div className={mono ? s.copyValue : undefined}>{value ?? <span className={s.muted}>待配置</span>}</div>
      </div>
      {value && (
        <button type="button" className={s.copyBtn} onClick={async () => { if (await copyText(value)) { setDone(true); setTimeout(() => setDone(false), 1800); } }}>
          {done ? '已复制 ✓' : '复制'}
        </button>
      )}
    </div>
  );
}

export function PayOrder({ orderNo, stripe }: { orderNo: string; stripe: string | null }) {
  const [d, setD] = useState<Data | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [payer, setPayer] = useState('');
  const [busy, setBusy] = useState(false);
  const [touch, setTouch] = useState(false);

  const load = useCallback(async (syncStripe = false) => {
    const r = await api<Data>(`/api/v1/orders/${encodeURIComponent(orderNo)}${syncStripe ? '?stripe=success' : ''}`);
    if (!r.ok) {
      if (r.status === 401) return setNeedLogin(true);
      return setErr(r.message);
    }
    setNeedLogin(false);
    setD(r.data);
    try {
      if (r.data.order.status === 'pending_payment') localStorage.setItem('sarec:lastOrder', orderNo);
      else if (localStorage.getItem('sarec:lastOrder') === orderNo) localStorage.removeItem('sarec:lastOrder');
    } catch { /* ignore */ }
    return r.data;
  }, [orderNo]);

  useEffect(() => {
    setTouch(typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    (async () => {
      const first = await load(stripe === 'success');
      // Stripe 刚付完：webhook 可能晚几秒，再查几次
      if (stripe === 'success' && first && first.order.status === 'pending_payment') {
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const x = await load(true);
          if (x && x.order.status !== 'pending_payment') break;
        }
      }
    })();
    // 从银行 App 切回来时刷新状态
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load, stripe]);

  if (needLogin) {
    return (
      <div className={s.page}>
        <Link href="/zh/me" className={s.back}>‹ 我的</Link>
        <h1 className={s.h1}>请先登录查看订单</h1>
        <p className={s.muted}>用申请时填写的邮箱收验证码即可，不需要密码。</p>
        <LoginBox onDone={() => load()} />
      </div>
    );
  }
  if (err) return <div className={s.page}><Link href="/zh/me" className={s.back}>‹ 我的</Link><p className={s.error}>{err}</p></div>;
  if (!d) return <div className={s.page}><p className={s.small}>加载中…</p></div>;
  const o = d.order;

  async function submitNote() {
    setBusy(true);
    setErr(null);
    const r = await api(`/api/v1/orders/${encodeURIComponent(orderNo)}/note`, { body: { note: note.trim() || `已通过 Zelle 付款，备注订单号 ${orderNo}`, payerName: payer.trim() || null } });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    load();
  }
  async function payByCard() {
    setBusy(true);
    setErr(null);
    const r = await api<{ url: string }>(`/api/v1/orders/${encodeURIComponent(orderNo)}/stripe`, { method: 'POST' });
    if (!r.ok) {
      setBusy(false);
      return setErr(r.message);
    }
    window.location.href = r.data.url;
  }

  const nextHref = o.purpose === 'event_fee' ? '/zh/me' : '/zh/me';
  const isMembership = o.purpose === 'membership';

  return (
    <div className={s.page}>
      <Link href="/zh/me" className={s.back}>‹ 我的</Link>
      <p className={s.eyebrow}>PAYMENT · {o.purposeLabel}</p>
      <h1 className={s.h1}>{o.status === 'paid' ? '付款已到账' : o.status === 'payment_submitted' ? '已提交，待确认到账' : o.status === 'cancelled' ? '订单已取消' : `付款 ${money(o.amountCents)}`}</h1>

      <div className={`${s.card} ${s.cardGold}`}>
        <p className={s.cardTitle}>{o.description ?? o.purposeLabel}</p>
        <CopyRow label="订单号（付款备注请填这个）" value={o.orderNo} />
        <CopyRow label="金额（美元）" value={(o.amountCents / 100).toFixed(2)} />
        {o.pointsRedeemed > 0 && <p className={s.small}>原价 {money(o.grossCents)}，已用 {o.pointsRedeemed} 积分抵扣 {money(o.grossCents - o.amountCents)}</p>}
        <div className={s.row}><span className={s.rowLabel}>状态</span><span className={s.rowValue}>{o.statusLabel}</span></div>
      </div>

      {o.status === 'paid' && (
        <>
          <p className={s.success}>{isMembership ? '您已是 SAREC 正式会员，确认邮件已发送。' : '付款已确认。'}</p>
          <Link className={`${s.btn} ${s.btnBlock}`} href={nextHref}>{isMembership ? '查看我的会员身份' : '回到我的'}</Link>
        </>
      )}
      {o.status === 'payment_submitted' && (
        <>
          <p className={s.notice}>
            {isMembership
              ? '已提交，待确认到账（通常 1 个工作日内）。工作人员核对 Zelle 到账后，您会自动成为正式会员并收到确认邮件，不需要再操作。'
              : '已提交，待确认到账（通常 1 个工作日内）。核对到账后会自动确认，不需要您再操作。'}
          </p>
          <Link className={`${s.btn} ${s.btnBlock}`} href={nextHref}>回到我的</Link>
        </>
      )}
      {o.status === 'cancelled' && <p className={s.error}>{o.rejectReason ? `原因：${o.rejectReason}。` : ''}如有疑问请联系商会工作人员。</p>}

      {o.status === 'pending_payment' && (
        <>
          {d.zelle.enabled && (
            <>
          <h2 className={s.h2}>方式一：Zelle 转账（推荐）</h2>
          <p className={s.notice} style={{ fontSize: '1.15rem' }}>
            <b>请用银行 App 扫码付款，备注填订单号：<span className={s.mono} style={{ color: 'var(--gold-bright)' }}>{o.orderNo}</span></b>
          </p>
          <div className={s.card}>
            <div className={s.qrBox}>
              <img src={d.zelle.qrUrl} alt="商会 Zelle 收款二维码" className={s.qrImg} />
              <p className={s.small}>{touch ? '长按二维码可保存到相册，在银行 App 的 Zelle 里扫码' : '可用手机银行 App 的 Zelle 扫这个二维码'}</p>
            </div>
            <div className={s.row}><span className={s.rowLabel}>收款人</span><span className={s.rowValue}>{d.zelle.name ?? '待配置'}</span></div>
            {!d.zelle.configured && <p className={s.small}>收款信息待配置，请稍后再付或联系工作人员。</p>}
          </div>
          <p className={s.small}>步骤：打开银行 App 的 Zelle → 扫上面的二维码 → 核对收款人 → 付款时备注订单号 → 回到本页点下面的按钮。</p>
          <div className={s.field} style={{ marginTop: '1rem' }}>
            <label className={s.label}>付款说明（选填）</label>
            <input className={s.input} placeholder="例如：已用 Chase Zelle 付款，备注了订单号" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className={s.field}>
            <label className={s.label}>代付人姓名（别人帮您付时填写）</label>
            <input className={s.input} value={payer} onChange={(e) => setPayer(e.target.value)} />
          </div>
          <button className={`${s.btn} ${s.btnBlock}`} disabled={busy} onClick={submitNote}>{busy ? '处理中…' : '我已用 Zelle 付款，提交'}</button>
            </>
          )}

          <h2 className={s.h2}>{d.zelle.enabled ? '方式二：银行卡在线支付' : '银行卡在线支付'}</h2>
          <p className={s.muted}>{d.zelle.enabled ? '没有美国银行账户，或想用信用卡，可以用这个方式（由 Stripe 安全处理，付完立即确认）。' : '支持信用卡、借记卡，由 Stripe 安全处理，付款成功立即确认。'}</p>
          {err && <p className={s.error} role="alert">{err}</p>}
          <button className={`${s.btn} ${s.btnGhost} ${s.btnBlock}`} disabled={busy || !d.stripe.available} onClick={payByCard}>
            {d.stripe.available ? (busy ? '正在打开…' : `银行卡支付 ${money(o.amountCents)}`) : '银行卡支付暂不可用'}
          </button>
          {stripe === 'cancel' && <p className={s.small}>您刚才取消了银行卡支付，可以重新选择付款方式。</p>}
          {o.submittedAt && <p className={s.small}>提交时间 {fmtDateTime(o.submittedAt)}</p>}
        </>
      )}
    </div>
  );
}
