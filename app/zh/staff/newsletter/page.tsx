'use client';
/** 邮件通讯：各期列表（送达 / 打开 / 点击 / 退订）、发信额度、新建一期 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Row = { id: number; subject: string; source: string; status: string; queued: number; send_errors: number; created_at: string; sent_at: string | null; recipient_count: number | null; sent: number; delivered: number; opened: number; clicked: number; unsubscribed: number; bounced: number; complained: number };
type Quota = { monthly: number; daily: number; usedToday: number; usedMonth: number; leftToday: number; leftMonth: number };
const STATUS: Record<string, string> = { draft: '草稿', sending: '发送中', sent: '已发送', cancelled: '已取消' };
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default function NewsletterList() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState<Quota | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ issues: Row[]; quota: Quota }>('/api/v1/staff/newsletter');
    if (r.ok) { setRows(r.data.issues); setQ(r.data.quota); } else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <StaffGate title="邮件通讯" role="ops" wide>
      {() => (
        <>
          <Msg m={msg} />
          <p className={styles.small}>
            只发给验证过邮箱、没有退订的会员和注册用户。每一期都要先发测试邮件给东哥看，东哥在后台点“确认发送”才会群发。每封自动带一键退订和商会地址。
          </p>
          {q && (
            <div className={styles.card}>
              <p className={styles.cardTitle}>发信额度（Resend 现有套餐）</p>
              <p className={styles.small} style={{ margin: 0 }}>
                本月已发 {q.usedMonth} / {q.monthly || '不限'} 封 · 今天 {q.usedToday} / {q.daily || '不限'} 封。群发前会预留 10% 给活动通知等日常邮件；不够时会拦下并发邮件提醒东哥。
                额度在“设置”里按套餐改（resend_monthly_quota / resend_daily_quota）。
              </p>
            </div>
          )}
          <button
            className={styles.btn}
            onClick={async () => {
              const r = await api<{ id: number }>('/api/v1/staff/newsletter', { body: { subject: '', body: '{姓名}，您好：\n\n' } });
              if (r.ok) router.push(`/zh/staff/newsletter/${r.data.id}`);
              else setMsg({ ok: false, text: r.message });
            }}
          >
            新建一期
          </button>
          <h2 className={styles.h2}>各期</h2>
          {!rows.length && <p className={styles.muted}>还没有通讯。</p>}
          {!!rows.length && (
            <table className={styles.table}>
              <thead><tr><th>标题</th><th>状态</th><th>收件人</th><th>送达</th><th>打开</th><th>点击</th><th>退订</th><th>退信 / 投诉</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/zh/staff/newsletter/${r.id}`} style={{ color: 'var(--gold)' }}>{r.subject || '（未写标题）'}</Link>{r.source === 'ai' ? <span className={styles.small}>（AI 草稿）</span> : null}<div className={styles.small}>{fmtDateTime(r.sent_at ?? r.created_at)}</div></td>
                    <td>{r.send_errors ? <span style={{ color: '#E7A1A1' }}>发送出错，{r.queued} 封没发出（会自动重试）</span> : r.status === 'sending' ? `发送中（剩 ${r.queued} 封）` : STATUS[r.status] ?? r.status}</td>
                    <td>{r.recipient_count ?? '—'}</td>
                    <td>{r.delivered} <span className={styles.small}>{pct(r.delivered, r.sent)}</span></td>
                    <td>{r.opened} <span className={styles.small}>{pct(r.opened, r.delivered || r.sent)}</span></td>
                    <td>{r.clicked} <span className={styles.small}>{pct(r.clicked, r.delivered || r.sent)}</span></td>
                    <td>{r.unsubscribed}</td>
                    <td>{r.bounced} / {r.complained}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </StaffGate>
  );
}
