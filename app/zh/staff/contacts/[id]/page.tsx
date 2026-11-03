'use client';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Detail = {
  contact: Record<string, string | number | null>;
  roleLabel: string | null;
  tags: { tag: string; source: string }[];
  answers: { item_code: string; prompt: string; value: unknown; source: string; status: string; recorded_by: string | null; created_at: string; task_event: string | null; is_unknown: boolean }[];
  points: { balance: number; ledger: { id: string; category: string; points: number; reason: string | null; created_by: string; created_at: string; reverses_id: string | null }[] };
  applications: { id: string; selected_tier_slug: string; application_status: string; payment_status: string; membership_end_date: string | null; display_status: string }[];
  timeline: { at: string; kind: string; text: string }[];
};
const SOURCE: Record<string, string> = { self_select: '本人点选', self_text: '本人原文', ai_confirmed: 'AI 整理经本人确认', staff: '工作人员记录', behavior: '系统行为', ai_guess: 'AI 推测' };
const STATUS: Record<string, string> = { current: '当前', history: '历史', expired: '已失效', pending_confirm: '待本人确认' };

function show(v: unknown): string {
  if (!v || typeof v !== 'object') return String(v ?? '');
  const o = v as Record<string, unknown>;
  if ('text' in o) return String(o.text);
  if ('choices' in o) return (o.choices as string[]).join('、') + (o.detail ? `（${o.detail}）` : '');
  if ('choice' in o) return String(o.choice) + (o.detail ? `（${o.detail}）` : '');
  if ('month' in o) return `${o.month} 月 ${o.day} 日`;
  if ('sub' in o) return String(o.sub);
  return Object.values(o).filter(Boolean).join(' ');
}

export default function StaffContactDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null);
  const [tab, setTab] = useState<'timeline' | 'answers' | 'points'>('timeline');
  const [adj, setAdj] = useState({ points: '', reason: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<Detail>(`/api/v1/staff/contacts/${params.id}`);
    if (r.ok) setD(r.data);
    else setMsg({ ok: false, text: r.message });
  }, [params.id]);
  useEffect(() => {
    load();
  }, [load]);

  async function adjust() {
    const r = await api('/api/v1/staff/points', { body: { contactId: params.id, points: Number(adj.points), reason: adj.reason } });
    setMsg(r.ok ? { ok: true, text: '积分已调整' } : { ok: false, text: r.message });
    if (r.ok) setAdj({ points: '', reason: '' });
    load();
  }
  async function reverse(id: string) {
    const reason = adj.reason.trim();
    if (!reason) return setMsg({ ok: false, text: '请先在下方“原因”里填写撤销原因，再点撤销' });
    const r = await api<{ message: string }>('/api/v1/staff/points', { body: { reverseLedgerId: id, reason } });
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    load();
  }

  const c = d?.contact;
  return (
    <StaffGate title={c ? String(c.name) : '客户档案'} role="ops" wide>
      {(s) =>
        d &&
        c && (
          <>
            <Msg m={msg} />
            <div className={styles.grid2}>
              <div className={styles.card}>
                <div className={styles.row}><span className={styles.rowLabel}>会员编号</span><span className={styles.rowValue}>#{c.member_no}</span></div>
                <div className={styles.row}><span className={styles.rowLabel}>另一姓名</span><span className={styles.rowValue}>{c.name_alt ?? '—'}</span></div>
                <div className={styles.row}><span className={styles.rowLabel}>手机</span><span className={styles.rowValue}>{c.phone_e164 ?? '—'}{c.phone_verified_at ? ' ✓' : ''}</span></div>
                <div className={styles.row}><span className={styles.rowLabel}>邮箱</span><span className={styles.rowValue}>{c.email ?? '—'}{c.email_verified_at ? ' ✓' : ''}</span></div>
                <div className={styles.row}><span className={styles.rowLabel}>微信</span><span className={styles.rowValue}>{c.wechat_openid ? '已绑定' : '—'}</span></div>
                <div className={styles.row}><span className={styles.rowLabel}>主要行业</span><span className={styles.rowValue}>{d.roleLabel ?? '—'}</span></div>
                <div className={styles.row}><span className={styles.rowLabel}>来源</span><span className={styles.rowValue}>{c.acquisition_source ?? '—'}</span></div>
                <div className={styles.row}><span className={styles.rowLabel}>积分余额</span><span className={styles.rowValue}>{d.points.balance}</span></div>
              </div>
              <div className={styles.card}>
                <p className={styles.cardTitle}>会员身份</p>
                {d.applications.length ? d.applications.map((a) => (
                  <p key={a.id} className={styles.small} style={{ margin: '0.2rem 0' }}>
                    {a.selected_tier_slug} · {a.application_status}/{a.payment_status} · 至 {a.membership_end_date ?? '—'} · 官网展示 {a.display_status}
                  </p>
                )) : <p className={styles.small}>注册用户（未缴费）</p>}
                <p className={styles.cardTitle} style={{ marginTop: '0.75rem' }}>标签</p>
                <div className={styles.chips}>
                  {d.tags.map((t) => <span key={t.tag + t.source} className={styles.badge} title={SOURCE[t.source]}>{t.tag}</span>)}
                  {!d.tags.length && <span className={styles.small}>暂无</span>}
                </div>
              </div>
            </div>

            <div className={styles.tabs}>
              {([['timeline', '时间线'], ['answers', '资料答案与来源'], ['points', '积分明细']] as const).map(([k, l]) => (
                <button key={k} className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            {tab === 'timeline' && (
              <ul className={styles.list}>
                {d.timeline.map((t, i) => (
                  <li key={i} className={styles.listItem} style={{ padding: '0.6rem 0' }}>
                    <span className={styles.small} style={{ display: 'inline-block', minWidth: '9rem' }}>{fmtDateTime(t.at)}</span> {t.text}
                  </li>
                ))}
              </ul>
            )}

            {tab === 'answers' && (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead><tr><th>题目</th><th>回答</th><th>来源</th><th>状态</th><th>时间</th></tr></thead>
                  <tbody>
                    {d.answers.map((a, i) => (
                      <tr key={i} style={a.status === 'current' ? undefined : { opacity: 0.6 }}>
                        <td className={styles.small}><span className={styles.mono}>{a.item_code}</span> {a.prompt}</td>
                        <td>{show(a.value)}{a.is_unknown ? '（未知）' : ''}</td>
                        <td className={styles.small}>{SOURCE[a.source] ?? a.source}{a.recorded_by && a.recorded_by !== 'self' ? `（${a.recorded_by}）` : ''}</td>
                        <td className={styles.small}>{STATUS[a.status] ?? a.status}</td>
                        <td className={styles.small}>{fmtDateTime(a.created_at)}{a.task_event ? ` · ${a.task_event}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'points' && (
              <>
                <table className={styles.table}>
                  <thead><tr><th>时间</th><th>积分</th><th>原因</th><th>操作人</th>{can(s, 'admin') && <th />}</tr></thead>
                  <tbody>
                    {d.points.ledger.map((p) => (
                      <tr key={p.id}>
                        <td className={styles.small}>{fmtDateTime(p.created_at)}</td>
                        <td>{p.points > 0 ? `+${p.points}` : p.points}</td>
                        <td className={styles.small}>{p.reason ?? p.category}</td>
                        <td className={styles.small}>{p.created_by}</td>
                        {can(s, 'admin') && <td>{!p.reverses_id && <button className={styles.copyBtn} onClick={() => reverse(p.id)}>撤销</button>}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {can(s, 'admin') && (
                  <div className={styles.card} style={{ marginTop: '1rem' }}>
                    <p className={styles.cardTitle}>积分调整</p>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="adj-p">积分（负数为扣减）</label>
                      <input id="adj-p" className={styles.input} inputMode="numeric" value={adj.points} onChange={(e) => setAdj({ ...adj, points: e.target.value })} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="adj-r">原因（必填，也用于撤销）</label>
                      <input id="adj-r" className={styles.input} value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
                    </div>
                    <button className={styles.btn} disabled={!adj.points || !adj.reason.trim()} onClick={adjust}>确认调整</button>
                  </div>
                )}
              </>
            )}
          </>
        )
      }
    </StaffGate>
  );
}
