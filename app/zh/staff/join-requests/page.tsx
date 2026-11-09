'use client';
/** 1.3.1 C：入会申请——小程序提交的申请；确认后一键发网站缴费链接（短信 / 邮件 / 复制发微信）；7 天没付的标红提醒跟进 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, copyText, fmtDateTime } from '@/components/crm/client';

type R = { id: string; name: string; company: string | null; industry: string | null; phone: string | null; email: string | null; source: string; status: string; created_at: string; link_sent_at: string | null; link_channel: string | null; member_no: number; event_title: string | null; overdue: boolean };
const ST: Record<string, string> = { new: '新申请', link_sent: '已发缴费链接', paid: '已入会', closed: '已关闭' };
const SRC: Record<string, string> = { home: '首页', checkin: '签到成功页', welcome: '欢迎页', me: '我的' };

export default function JoinRequests() {
  const [rows, setRows] = useState<R[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ requests: R[] }>('/api/v1/staff/join-requests');
    if (r.ok) setRows(r.data.requests); else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (b: Record<string, string>, okText: string) => {
    const r = await api<{ text?: string }>('/api/v1/staff/join-requests', { body: b });
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    if (r.data.text) await copyText(r.data.text);
    setMsg({ ok: true, text: okText });
    load();
  };
  return (
    <StaffGate title="入会申请" role="ops" wide>
      {() => (
        <>
          <p className={styles.small}>小程序里不出现金额和付款：申请人只提交意向。确认后点“发缴费链接”，系统把网站入会链接发给他（短信或邮件；也可以复制后自己发微信）。满 7 天还没入会的标红，系统会提醒跟进一次，不会自动催客户。</p>
          <Msg m={msg} />
          {!rows.length && <p className={styles.muted}>还没有申请。</p>}
          {rows.map((r) => (
            <div key={r.id} className={styles.card} style={r.overdue ? { borderLeft: '4px solid #E7A1A1' } : undefined}>
              <div><b>#{r.member_no} {r.name}</b> · {ST[r.status] ?? r.status}{r.overdue ? '（已满 7 天，请跟进）' : ''}</div>
              <div className={styles.small}>{[r.company, r.industry, r.phone, r.email].filter(Boolean).join(' · ') || '只留了姓名'}</div>
              <div className={styles.small}>来自{SRC[r.source] ?? r.source}{r.event_title ? `（${r.event_title}）` : ''} · {fmtDateTime(r.created_at)}{r.link_sent_at ? ` · ${fmtDateTime(r.link_sent_at)} 已发链接（${r.link_channel === 'sms' ? '短信' : r.link_channel === 'email' ? '邮件' : '复制'}）` : ''}</div>
              {(r.status === 'new' || r.status === 'link_sent') && (
                <div className={styles.btnRow}>
                  {r.phone && <button className={styles.btn} onClick={() => act({ id: r.id, action: 'send_link', channel: 'sms' }, `已用短信把入会链接发给 ${r.name}`)}>短信发缴费链接</button>}
                  {r.email && <button className={styles.btnQuiet} onClick={() => act({ id: r.id, action: 'send_link', channel: 'email' }, `已用邮件把入会链接发给 ${r.name}`)}>邮件发</button>}
                  <button className={styles.btnQuiet} onClick={() => act({ id: r.id, action: 'send_link', channel: 'copy' }, '链接和话术已复制，粘到微信发给他')}>复制发微信</button>
                  <button className={styles.btnQuiet} onClick={() => act({ id: r.id, action: 'status', status: 'paid' }, '已标记入会')}>已入会</button>
                  <button className={styles.btnQuiet} onClick={() => act({ id: r.id, action: 'status', status: 'closed' }, '已关闭')}>关闭</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </StaffGate>
  );
}
