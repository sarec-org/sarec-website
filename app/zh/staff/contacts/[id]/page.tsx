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
  contactMethods: { kind: 'email' | 'phone'; value: string; status: string; status_text: string; is_current: boolean; source: string; created_at: string; replaced_at: string | null; invalid_reason: string | null }[];
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

// 和 lib/crm/regions.ts 的 REGIONS 一致（那个文件连数据库，不能在浏览器里引）
const REGIONS = ['洛杉矶/橙县', '旧金山湾区', '纽约', '美国其他', '中国大陆', '其他'];

/** 1.4.0（改动单 D6）：客户档案里改常住地区（接口 /api/v1/staff/contact-region 早就有，页面原来没接） */
function RegionEdit({ id, self, inferred, onDone }: { id: string; self: string | null; inferred: string | null; onDone: (m: { ok: boolean; text: string }) => void }) {
  const [v, setV] = useState(self ?? '');
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(self ?? ''), [self]);
  return (
    <div className={styles.row} style={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <span className={styles.rowLabel}>常住地区</span>
      <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 220px', justifyContent: 'flex-end' }}>
        <select className={styles.select} style={{ width: 'auto', flex: '1 1 150px', maxWidth: 220 }} aria-label="常住地区" value={v} onChange={(e) => setV(e.target.value)}>
          <option value="">没填（按参加的活动推断{inferred ? `：${inferred}` : ''}）</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          disabled={busy || v === (self ?? '')}
          onClick={async () => {
            setBusy(true);
            const r = await api('/api/v1/staff/contact-region', { body: { contactId: id, region: v || null } });
            setBusy(false);
            onDone(r.ok ? { ok: true, text: v ? `常住地区已改为「${v}」，活动推广按这个地区算` : '已清空常住地区，改回按参加的活动推断' } : { ok: false, text: r.message });
          }}
        >
          {busy ? '保存中…' : '保存地区'}
        </button>
      </span>
    </div>
  );
}

export default function StaffContactDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null);
  const [tab, setTab] = useState<'timeline' | 'answers' | 'points' | 'methods'>('timeline');
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
                {(['phone', 'email'] as const).map((k) => {
                  const m = d.contactMethods.find((x) => x.kind === k && x.is_current);
                  return (
                    <div key={k} className={styles.row}>
                      <span className={styles.rowLabel}>{k === 'phone' ? '手机' : '邮箱'}</span>
                      <span className={styles.rowValue}>
                        {m ? m.value : '—'}
                        {m && <span style={{ marginLeft: '0.4rem', color: m.status === 'confirmed' ? '#9fd6a8' : m.status === 'invalid' ? '#f3a1a1' : 'var(--ivory-mute)' }}>{m.status_text}</span>}
                      </span>
                    </div>
                  );
                })}
                <div className={styles.row}><span className={styles.rowLabel}>登录身份</span><span className={styles.rowValue}>{[c.email_verified_at ? c.email : null, c.phone_verified_at ? c.phone_e164 : null].filter(Boolean).join('、') || '无（不能登录网站）'}</span></div>
                <div className={styles.row}><span className={styles.rowLabel}>微信</span><span className={styles.rowValue}>{c.wechat_openid ? '已绑定' : '—'}</span></div>
                <RegionEdit id={params.id} self={(c.region_self as string | null) ?? null} inferred={(c.region_inferred as string | null) ?? null} onDone={(m) => { setMsg(m); load(); }} />
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
              {([['timeline', '时间线'], ['answers', '资料答案与来源'], ['points', '积分明细'], ['methods', '联系方式历史']] as const).map(([k, l]) => (
                <button key={k} className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>

            {tab === 'methods' && (
              <table className={styles.table}>
                <thead><tr><th>类型</th><th>号码 / 邮箱</th><th>状态</th><th>来源</th><th>填写时间</th><th>被替换</th></tr></thead>
                <tbody>
                  {d.contactMethods.map((m, i) => (
                    <tr key={i} style={m.is_current ? undefined : { opacity: 0.6 }}>
                      <td>{m.kind === 'phone' ? '手机' : '邮箱'}{m.is_current ? '（当前）' : ''}</td>
                      <td className={styles.mono}>{m.value}</td>
                      <td>{m.status_text}{m.invalid_reason ? `：${m.invalid_reason}` : ''}</td>
                      <td className={styles.small}>{({ registration: '报名', profile: '本人修改', login: '验证码登录', staff: '工作人员', backfill: '原有' } as Record<string, string>)[m.source] ?? m.source}</td>
                      <td className={styles.small}>{fmtDateTime(m.created_at)}</td>
                      <td className={styles.small}>{m.replaced_at ? fmtDateTime(m.replaced_at) : '—'}</td>
                    </tr>
                  ))}
                  {!d.contactMethods.length && <tr><td colSpan={6} className={styles.small}>暂无</td></tr>}
                </tbody>
              </table>
            )}

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
