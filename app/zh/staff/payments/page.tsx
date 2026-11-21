'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, copyText, fmtDateTime, money } from '@/components/crm/client';

type O = {
  order_no: string; purpose_label: string; description: string | null; amount_cents: number; points_redeemed: number; status: string; status_label: string; pay_link?: string | null;
  provider: string; payer_name: string | null; payer_note: string | null; submitted_at: string | null; created_at: string; paid_at: string | null;
  verified_by: string | null; reject_reason: string | null; contact_id: string; name: string; email: string | null; phone_e164: string | null;
};
const FILTERS: [string, string][] = [['open', '待处理'], ['payment_submitted', '待核款'], ['pending_payment', '待付款'], ['paid', '已到账'], ['cancelled', '已取消'], ['demo', '审核演示 / 测试订单']];

export default function StaffPayments() {
  const [status, setStatus] = useState('open');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<O[] | null>(null);
  const [ref, setRef] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ orders: O[] }>(`/api/v1/staff/orders?status=${status}&q=${encodeURIComponent(q)}`);
    if (r.ok) setRows(r.data.orders);
    else setMsg({ ok: false, text: r.message });
  }, [status, q]);
  const [ready, setReady] = useState(false);
  // 「今天」和通知里的链接带 ?id=<订单号>（旧的 ?order= 照样认）：直接定位到这一笔
  const [focus, setFocus] = useState<string | null>(null);
  const [looked, setLooked] = useState(false);
  useEffect(() => {
    // 后台综合优化 五.5：通知里的链接带 ?order=<订单号>，直接打开这一笔
    const sp = new URLSearchParams(location.search);
    const o = sp.get('id') || sp.get('order');
    if (o) {
      setQ(o);
      setFocus(o);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) load();
  }, [status, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!focus || !rows) return;
    if (rows.some((o) => o.order_no === focus)) {
      document.getElementById(`order-${focus}`)?.scrollIntoView({ block: 'center' });
      return;
    }
    if (looked) return;
    setLooked(true);
    // 不在当前这一栏（已到账、已取消、审核演示…）：到别的栏找一次
    (async () => {
      for (const [k] of FILTERS) {
        if (k === status) continue;
        const r = await api<{ orders: O[] }>(`/api/v1/staff/orders?status=${k}&q=${encodeURIComponent(focus)}`);
        if (r.ok && r.data.orders.some((o) => o.order_no === focus)) return setStatus(k);
      }
    })();
  }, [rows, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verify(no: string) {
    setBusy(no);
    const r = await api<{ message: string }>(`/api/v1/staff/orders/${no}/verify`, { body: { reference: ref[no] ?? '' } });
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: `${no}：${r.data.message}` } : { ok: false, text: r.message });
    load();
  }
  async function reject(no: string) {
    setBusy(no);
    const r = await api<{ message: string }>(`/api/v1/staff/orders/${no}/reject`, { body: { reason: reason[no] ?? '' } });
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: `${no}：${r.data.message}` } : { ok: false, text: r.message });
    if (r.ok) setRejecting(null);
    load();
  }

  return (
    <StaffGate title="核款" role="finance">
      {() => (
        <>
          <p className={styles.muted}>请先在 Chase 网银核对 Zelle 实际到账（备注里有订单号），再点“确认到账”。截图或会员说“已付款”不算到账。</p>
          <div className={styles.tabs}>
            {FILTERS.map(([k, l]) => (
              <button key={k} className={`${styles.tab} ${status === k ? styles.tabOn : ''}`} onClick={() => setStatus(k)}>{l}</button>
            ))}
          </div>
          <div className={styles.inputRow} style={{ marginBottom: '1rem' }}>
            <input className={styles.input} placeholder="订单号 / 姓名 / 邮箱" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
            <button className={styles.btn} onClick={load}>搜索</button>
          </div>
          <Msg m={msg} />
          {rows?.map((o) => (
            <div key={o.order_no} id={`order-${o.order_no}`} className={`${styles.card} ${o.status === 'payment_submitted' ? styles.cardGold : ''}`} style={focus === o.order_no ? { outline: '2px solid var(--gold)' } : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className={styles.mono} style={{ fontSize: '1.2rem' }}>{o.order_no}</span>
                <span className={`${styles.badge} ${o.status === 'paid' ? styles.badgeGreen : o.status === 'cancelled' ? styles.badgeRed : ''}`}>{o.status_label}</span>
              </div>
              <p style={{ fontSize: '1.4rem', margin: '0.25rem 0' }}>{money(o.amount_cents)} <span className={styles.small}>{o.purpose_label} · {o.description}</span></p>
              {o.points_redeemed > 0 && <p className={styles.small}>已用 {o.points_redeemed} 积分抵扣</p>}
              <p className={styles.small} style={{ margin: 0 }}>
                <a href={`/zh/staff/contacts/${o.contact_id}`} style={{ color: 'var(--gold)' }}>{o.name}</a> · {o.phone_e164 ?? o.email}
              </p>
              {o.payer_note && <p className={styles.small} style={{ margin: '0.25rem 0' }}>付款说明：{o.payer_note}{o.payer_name ? `（付款人 ${o.payer_name}）` : ''}</p>}
              <p className={styles.small} style={{ margin: 0 }}>
                {o.submitted_at ? `提交于 ${fmtDateTime(o.submitted_at)}` : `下单于 ${fmtDateTime(o.created_at)}`}
                {o.paid_at ? ` · 到账 ${fmtDateTime(o.paid_at)}（${o.verified_by ?? o.provider}）` : ''}
                {o.reject_reason ? ` · 原因：${o.reject_reason}` : ''}
              </p>
              {o.pay_link && (
                <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ marginTop: 6 }} onClick={async () => setMsg({ ok: await copyText(o.pay_link!), text: '付款链接已复制，可以直接发给本人' })}>
                  复制本人付款链接
                </button>
              )}
              {(o.status === 'payment_submitted' || o.status === 'pending_payment') && (
                <div style={{ marginTop: '0.75rem' }}>
                  <input className={styles.input} placeholder="银行流水号（选填）" value={ref[o.order_no] ?? ''} onChange={(e) => setRef({ ...ref, [o.order_no]: e.target.value })} style={{ marginBottom: '0.5rem' }} />
                  {rejecting === o.order_no && (
                    <input className={styles.input} placeholder="原因（必填），例如：核实未到账" value={reason[o.order_no] ?? ''} onChange={(e) => setReason({ ...reason, [o.order_no]: e.target.value })} style={{ marginBottom: '0.5rem' }} />
                  )}
                  <div className={styles.btnRow}>
                    {rejecting !== o.order_no ? (
                      <>
                        <button className={styles.btn} disabled={busy === o.order_no} onClick={() => verify(o.order_no)}>
                          {busy === o.order_no ? '处理中…' : '确认到账'}
                        </button>
                        <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy === o.order_no} onClick={() => setRejecting(o.order_no)}>
                          未到账
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy === o.order_no || !(reason[o.order_no] ?? '').trim()} onClick={() => reject(o.order_no)}>
                          确认：未到账并取消
                        </button>
                        <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setRejecting(null)}>返回</button>
                      </>
                    )}
                  </div>
                  {o.purpose_label === '会费' && <p className={styles.small}>会费在会员提交付款说明时已先生效；标记“未到账”会同时撤销该会员身份。</p>}
                </div>
              )}
            </div>
          ))}
          {rows && !rows.length && <p className={styles.muted}>没有需要处理的订单。</p>}
        </>
      )}
    </StaffGate>
  );
}
