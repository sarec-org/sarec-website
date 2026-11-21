'use client';
/**
 * 入会申请。后台综合优化 一.1：申请一提交，系统自动把网站缴费链接发给申请人（短信，有邮箱同时发邮件），发了什么、什么时候发的记在每条申请上；
 * 3 天没缴费进「今天」提醒人工跟一次。通知里的链接带 ?id= 直接打开这一条（手机一屏看完）。
 * 小程序里不出现金额和付款：申请人只提交意向。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, copyText, fmtDateTime } from '@/components/crm/client';
import { ContactButtons, MemberBadge } from '@/components/crm/staff/ContactButtons';

type Log = { at: string; by: string; channel: string; to: string; status: string; text: string };
type R = {
  id: string; contact_id: string; name: string; company: string | null; industry: string | null; phone: string | null; email: string | null; source: string; status: string;
  created_at: string; link_sent_at: string | null; link_channel: string | null; member_no: number; event_title: string | null; overdue: boolean; unpaid3: boolean;
  link_log: Log[]; auto_link_at: string | null; nudged_at: string | null; nudged_by: string | null; account_kind: string | null;
};
const ST: Record<string, string> = { new: '新申请', link_sent: '已发缴费链接', paid: '已入会', closed: '已关闭' };
const SRC: Record<string, string> = { home: '首页', checkin: '签到成功页', welcome: '欢迎页', me: '我的' };
const CH: Record<string, string> = { sms: '短信', email: '邮件', copy: '复制发微信' };
const LS: Record<string, string> = { sent: '已发出', held: '只记录没发（通知总闸关着）', blocked: '只记录没发（测试站只发测试身份）', failed: '没发出去', duplicate: '同一条已经发过', copied: '已复制' };

export default function JoinRequests() {
  const [rows, setRows] = useState<R[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async (id?: string | null) => {
    const r = await api<{ requests: R[] }>(`/api/v1/staff/join-requests${id ? `?id=${encodeURIComponent(id)}` : ''}`);
    if (r.ok) setRows(r.data.requests); else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    setFocus(id);
    load(id);
  }, [load]);
  const act = async (b: Record<string, string>, okText: string) => {
    const r = await api<{ text?: string }>('/api/v1/staff/join-requests', { body: b });
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    if (r.data.text) await copyText(r.data.text);
    setMsg({ ok: true, text: okText });
    load(focus);
  };
  const big = { minHeight: 44 };
  return (
    <StaffGate title="入会申请" role="ops" wide={!focus}>
      {() => (
        <>
          {focus ? (
            <p className={styles.small}><Link href="/zh/staff/join-requests" style={{ color: 'var(--gold)' }} onClick={() => { setFocus(null); load(null); }}>看全部入会申请 ›</Link></p>
          ) : (
            <p className={styles.small}>申请一提交，系统自动把网站入会链接发给申请人（短信；有邮箱同时发邮件），下面每条都记着发了什么、什么时候。3 天还没入会的会进「今天」提醒跟一次，系统不会自动催客户。小程序里不出现金额。</p>
          )}
          <Msg m={msg} />
          {!rows.length && <p className={styles.muted}>{focus ? '找不到这份申请（可能已经处理过）。' : '还没有申请。'}</p>}
          {rows.map((r) => (
            <div key={r.id} className={styles.card} style={r.unpaid3 || r.overdue ? { borderLeft: '4px solid #E7A1A1' } : undefined}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link href={`/zh/staff/contacts/${r.contact_id}`} style={{ color: 'inherit', fontSize: '1.1rem' }}><b>{r.name}</b></Link>
                <span className={styles.small}>#{r.member_no}</span>
                <span className={styles.badge}>{ST[r.status] ?? r.status}</span>
                <MemberBadge kind={r.account_kind} />
                {r.unpaid3 && <span className={`${styles.badge} ${styles.badgeRed}`}>3 天没缴费，请跟一次</span>}
                {r.nudged_at && <span className={styles.small}>{r.nudged_by} {fmtDateTime(r.nudged_at)} 跟进过</span>}
              </div>
              <div className={styles.small}>{[r.company, r.industry].filter(Boolean).join(' · ') || '没填公司和行业'}</div>
              <div className={styles.small}>来自{SRC[r.source] ?? r.source}{r.event_title ? `（${r.event_title}）` : ''} · {fmtDateTime(r.created_at)} 申请</div>
              {(r.link_log ?? []).length > 0 && (
                <details style={{ margin: '0.4rem 0' }} open={!!focus}>
                  <summary className={styles.small} style={{ cursor: 'pointer' }}>发过的缴费链接（{r.link_log.length} 次）</summary>
                  {r.link_log.map((l, i) => (
                    <div key={i} className={styles.small} style={{ margin: '0.3rem 0' }}>
                      {fmtDateTime(l.at)} · {l.by} · {CH[l.channel] ?? l.channel} {l.to} · <b>{LS[l.status] ?? l.status}</b>
                      <div style={{ whiteSpace: 'pre-wrap', opacity: 0.85 }}>{l.text}</div>
                    </div>
                  ))}
                </details>
              )}
              {!(r.link_log ?? []).length && r.link_sent_at && (
                <div className={styles.small}>{fmtDateTime(r.link_sent_at)} 已发链接（{CH[r.link_channel ?? ''] ?? '—'}）</div>
              )}
              <ContactButtons phone={r.phone} email={r.email} name={r.name} smsDraft={`${r.name}您好，我是 SAREC 中美房地产商会的工作人员。看到您申请入会，网站缴费链接已发到您手机，有任何问题随时问我。`} />
              {(r.status === 'new' || r.status === 'link_sent') && (
                <div className={styles.btnRow} style={{ flexWrap: 'wrap' }}>
                  {r.phone && <button className={styles.btn} style={big} onClick={() => act({ id: r.id, action: 'send_link', channel: 'sms' }, `已用短信把入会链接发给 ${r.name}`)}>短信再发缴费链接</button>}
                  {r.email && <button className={`${styles.btn} ${styles.btnQuiet}`} style={big} onClick={() => act({ id: r.id, action: 'send_link', channel: 'email' }, `已用邮件把入会链接发给 ${r.name}`)}>邮件发</button>}
                  <button className={`${styles.btn} ${styles.btnQuiet}`} style={big} onClick={() => act({ id: r.id, action: 'send_link', channel: 'copy' }, '链接和话术已复制，粘到微信发给他')}>复制发微信</button>
                  {r.unpaid3 && <button className={`${styles.btn} ${styles.btnQuiet}`} style={big} onClick={() => act({ id: r.id, action: 'nudged' }, '已记下：跟进过一次')}>我跟进了</button>}
                  <button className={`${styles.btn} ${styles.btnQuiet}`} style={big} onClick={() => act({ id: r.id, action: 'status', status: 'paid' }, '已标记入会')}>已入会</button>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} style={big} onClick={() => act({ id: r.id, action: 'status', status: 'closed' }, '已关闭')}>关闭</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </StaffGate>
  );
}
