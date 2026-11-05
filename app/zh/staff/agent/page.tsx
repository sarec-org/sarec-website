'use client';
/**
 * 工作人员后台 · AI 助手：看板（每天调用次数、各级占比、花费、被拦截次数、每条线索成本）、预算与测试开关、常见问题库、最近对话。
 */
import { Fragment, useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Day = { day: string; calls: number; tier0: number; tier1: number; tier2: number; cache_hits: number; model_calls: number; blocked: number; slowed: number; limited: number; leads: number; cost_micros: string };
type Budget = { monthlyUsd: number; dailyUsd: number; monthMicros: number; todayMicros: number; monthPct: number; dayPct: number; pct: number; testPct: number | null; level: string };
type Faq = { id: number; intent: string; title: string; keywords: string[]; answer_zh: string; answer_en: string | null; priority: number; is_active: boolean; hits: number };
type Conv = { id: string; created_at: string; last_message_at: string; audience: string; page: string | null; page_title: string | null; turns: number; is_lead: boolean; lead_at: string | null; cost_micros: string; contact_name: string | null; first_question: string | null; registered_slugs: string[] };
type Data = { days: Day[]; budget: Budget; status: { mock: boolean; gemini: boolean; anthropic: boolean; geminiModel: string; claudeModel: string; turnstile: boolean }; faqs: Faq[]; conversations: Conv[] };
type Detail = { conversation: Record<string, unknown>; messages: { id: string; role: string; content: string; tier: number | null; route: string | null; model: string | null; input_tokens: number; output_tokens: number; cache_read_tokens: number; cost_micros: string; cached: boolean; created_at: string }[] };

const usd = (micros: number | string) => {
  const n = Number(micros) / 1e6;
  return `$${n.toFixed(n < 0.01 && n > 0 ? 4 : 2)}`;
};
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');
const AUD: Record<string, string> = { visitor: '访客', logged_in: '已登录', registered: '已报名', member: '会员' };
const LEVEL: Record<string, string> = { ok: '正常', warn: '已过 70%（已邮件提醒）', restrict: '已过 90%：只给会员和线索调模型', stop: '已到 100%：全部走常见问题库' };
const fmt = (iso: string) => new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const EMPTY_FAQ = { id: 0, intent: '', title: '', keywords: '', answerZh: '', answerEn: '', priority: '0', isActive: true };

export default function StaffAgent() {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [monthly, setMonthly] = useState('');
  const [testPct, setTestPct] = useState('');
  const [leadsOnly, setLeadsOnly] = useState(false);
  const [edit, setEdit] = useState<typeof EMPTY_FAQ | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = useCallback(async () => {
    const r = await api<Data>(`/api/v1/staff/agent${leadsOnly ? '?leads=1' : ''}`);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setD(r.data);
    setMonthly(String(r.data.budget.monthlyUsd));
    setTestPct(r.data.budget.testPct === null ? '' : String(r.data.budget.testPct));
  }, [leadsOnly]);
  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>, okText: string) {
    const r = await api('/api/v1/staff/agent', { body });
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.message });
    if (r.ok) load();
    return r.ok;
  }
  async function toggle(id: string) {
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    setDetail(null);
    const r = await api<Detail>(`/api/v1/staff/agent/conversations/${id}`);
    if (r.ok) setDetail(r.data);
    else setMsg({ ok: false, text: r.message });
  }

  return (
    <StaffGate title="AI 助手" role="ops" wide>
      {() =>
        d && (
          <>
            <Msg m={msg} />
            <div className={styles.card}>
              <p style={{ margin: 0 }}>
                运行方式：
                <strong>{d.status.mock ? '模拟模式（不调用真实模型，不花钱）' : `第 1 级 ${d.status.gemini ? d.status.geminiModel : '未配置'} · 第 2 级 ${d.status.anthropic ? d.status.claudeModel : '未配置'}`}</strong>
                {'　'}人机验证：{d.status.turnstile ? '已配置' : '未配置（可疑访客只降速）'}
              </p>
            </div>

            <h2 className={styles.h2}>预算</h2>
            <div className={styles.card}>
              <p>
                本月 {usd(d.budget.monthMicros)} / ${d.budget.monthlyUsd.toFixed(2)}（{d.budget.monthPct.toFixed(0)}%）　今天 {usd(d.budget.todayMicros)} / ${d.budget.dailyUsd.toFixed(2)}（{d.budget.dayPct.toFixed(0)}%）
              </p>
              <p>
                当前按 <strong>{d.budget.pct.toFixed(0)}%</strong> 运行：{LEVEL[d.budget.level] ?? d.budget.level}
                {d.budget.testPct !== null && <span className={styles.badge} style={{ marginLeft: 8 }}>测试开关已打开</span>}
              </p>
              <div className={styles.row}>
                <span className={styles.rowLabel}>月预算（美元，每日预算 = 月预算 / 30）</span>
                <input className={styles.input} style={{ maxWidth: 140 }} inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>测试开关：按此百分比运行（留空 = 关闭）</span>
                <select className={styles.select} style={{ maxWidth: 160 }} value={testPct} onChange={(e) => setTestPct(e.target.value)}>
                  <option value="">关闭</option>
                  <option value="50">50%</option>
                  <option value="70">70%（发提醒邮件）</option>
                  <option value="90">90%（只给会员 / 线索）</option>
                  <option value="100">100%（全部常见问题库）</option>
                </select>
              </div>
              <div className={styles.btnRow}>
                <button className={styles.btn} onClick={() => post({ kind: 'settings', monthlyUsd: monthly, testPct: testPct === '' ? null : Number(testPct) }, '预算设置已保存')}>
                  保存
                </button>
              </div>
              <p className={styles.small}>Google / Anthropic 后台的硬上限需要另外在各自控制台设置；这里的预算是网站自己的兜底。</p>
            </div>

            <h2 className={styles.h2}>每日用量（洛杉矶日期，最近 14 天）</h2>
            <div className={styles.card} style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>回答条数</th>
                    <th>第 0 级</th>
                    <th>第 1 级</th>
                    <th>第 2 级</th>
                    <th>缓存</th>
                    <th>模型调用</th>
                    <th>花费</th>
                    <th>拦截</th>
                    <th>降速</th>
                    <th>超条数</th>
                    <th>线索</th>
                    <th>每条线索成本</th>
                  </tr>
                </thead>
                <tbody>
                  {d.days.length === 0 && (
                    <tr>
                      <td colSpan={13} className={styles.muted}>还没有用量</td>
                    </tr>
                  )}
                  {d.days.map((x) => (
                    <tr key={x.day}>
                      <td>{x.day}</td>
                      <td>{x.calls}</td>
                      <td>{x.tier0}（{pct(x.tier0, x.calls)}）</td>
                      <td>{x.tier1}（{pct(x.tier1, x.calls)}）</td>
                      <td>{x.tier2}（{pct(x.tier2, x.calls)}）</td>
                      <td>{x.cache_hits}</td>
                      <td>{x.model_calls}</td>
                      <td>{usd(x.cost_micros)}</td>
                      <td>{x.blocked}</td>
                      <td>{x.slowed}</td>
                      <td>{x.limited}</td>
                      <td>{x.leads}</td>
                      <td>{x.leads ? usd(Number(x.cost_micros) / x.leads) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className={styles.h2}>常见问题库（第 0 级，不调模型）</h2>
            <p className={styles.small}>
              关键词用逗号分隔，任一命中即匹配；“活动+时间”表示两个词同时出现。只对 60 字以内的短问题生效。回答里可以写 {'{next_event}'}（数据库最近一场活动）或 {'{events_list}'}（近期 3 场）。不要写会员价格或任何回报数字。
            </p>
            {edit && (
              <div className={`${styles.card} ${styles.cardGold}`}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="faq-title">标题</label>
                  <input id="faq-title" className={styles.input} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                </div>
                {!edit.id && (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="faq-intent">意图代号（英文，可留空）</label>
                    <input id="faq-intent" className={styles.input} value={edit.intent} onChange={(e) => setEdit({ ...edit, intent: e.target.value })} />
                  </div>
                )}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="faq-kw">关键词</label>
                  <textarea id="faq-kw" className={styles.textarea} rows={2} value={edit.keywords} onChange={(e) => setEdit({ ...edit, keywords: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="faq-zh">中文回答</label>
                  <textarea id="faq-zh" className={styles.textarea} rows={4} value={edit.answerZh} onChange={(e) => setEdit({ ...edit, answerZh: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="faq-en">英文回答（可留空）</label>
                  <textarea id="faq-en" className={styles.textarea} rows={3} value={edit.answerEn} onChange={(e) => setEdit({ ...edit, answerEn: e.target.value })} />
                </div>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>优先级（同分时高的优先）</span>
                  <input className={styles.input} style={{ maxWidth: 100 }} inputMode="numeric" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} />
                </div>
                <label className={styles.small}>
                  <input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> 启用
                </label>
                <div className={styles.btnRow}>
                  <button
                    className={styles.btn}
                    onClick={async () => {
                      if (await post({ kind: 'faq', id: edit.id || undefined, intent: edit.intent, title: edit.title, keywords: edit.keywords, answerZh: edit.answerZh, answerEn: edit.answerEn, priority: Number(edit.priority) || 0, isActive: edit.isActive }, '已保存')) setEdit(null);
                    }}
                  >
                    保存
                  </button>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setEdit(null)}>
                    取消
                  </button>
                  {!!edit.id && (
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={async () => {
                        if (confirm('确定删除这条常见问题？')) if (await post({ kind: 'faq', id: edit.id, delete: true }, '已删除')) setEdit(null);
                      }}
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            )}
            {!edit && (
              <button className={styles.btn} onClick={() => setEdit({ ...EMPTY_FAQ })}>
                新增一条
              </button>
            )}
            <div className={styles.card} style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>标题</th>
                    <th>关键词</th>
                    <th>回答</th>
                    <th>命中</th>
                    <th>状态</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.faqs.map((f) => (
                    <tr key={f.id}>
                      <td>{f.title}</td>
                      <td className={styles.small}>{f.keywords.join('，')}</td>
                      <td className={styles.small} style={{ whiteSpace: 'pre-wrap', maxWidth: 360 }}>{f.answer_zh}</td>
                      <td>{f.hits}</td>
                      <td>{f.is_active ? '启用' : '停用'}</td>
                      <td>
                        <button
                          className={`${styles.btn} ${styles.btnQuiet}`}
                          onClick={() => setEdit({ id: f.id, intent: f.intent, title: f.title, keywords: f.keywords.join('，'), answerZh: f.answer_zh, answerEn: f.answer_en ?? '', priority: String(f.priority), isActive: f.is_active })}
                        >
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className={styles.h2}>最近对话</h2>
            <label className={styles.small}>
              <input type="checkbox" checked={leadsOnly} onChange={(e) => setLeadsOnly(e.target.checked)} /> 只看线索
            </label>
            <p className={styles.small}>访客确认提交的线索同时出现在“待跟进”（来源：AI 助手线索），并已邮件通知 info@。</p>
            <div className={styles.card} style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>最后消息</th>
                    <th>身份</th>
                    <th>页面</th>
                    <th>第一句</th>
                    <th>轮数</th>
                    <th>线索</th>
                    <th>花费</th>
                  </tr>
                </thead>
                <tbody>
                  {d.conversations.map((c) => (
                    <Fragment key={c.id}>
                      <tr onClick={() => toggle(c.id)} style={{ cursor: 'pointer' }}>
                        <td>{fmt(c.last_message_at)}</td>
                        <td>
                          {AUD[c.audience] ?? c.audience}
                          {c.contact_name ? ` · ${c.contact_name}` : ''}
                        </td>
                        <td className={styles.small}>{[c.page, c.page_title].filter(Boolean).join('：') || '—'}</td>
                        <td className={styles.small}>{c.first_question?.slice(0, 60) ?? ''}</td>
                        <td>{c.turns}</td>
                        <td>{c.lead_at ? <span className={`${styles.badge} ${styles.badgeGreen}`}>已提交</span> : c.is_lead ? <span className={styles.badge}>未留联系方式</span> : ''}{c.registered_slugs?.length ? ' 已报名' : ''}</td>
                        <td>{usd(c.cost_micros)}</td>
                      </tr>
                      {open === c.id && (
                        <tr>
                          <td colSpan={7}>
                            {!detail && <span className={styles.muted}>正在加载…</span>}
                            {detail?.messages.map((m) => (
                              <div key={m.id} style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--line-2)' }}>
                                <span className={styles.small}>
                                  {m.role === 'user' ? '访客' : m.role === 'assistant' ? '助手' : '事件'} · {fmt(m.created_at)}
                                  {m.role === 'assistant' && ` · 第 ${m.tier ?? '-'} 级 · ${m.route ?? ''}${m.cached ? ' · 缓存' : ''}${m.model ? ` · ${m.model}` : ''} · ${m.input_tokens}+${m.cache_read_tokens} 入 / ${m.output_tokens} 出 · ${usd(m.cost_micros)}`}
                                </span>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
