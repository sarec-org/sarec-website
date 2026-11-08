'use client';
/**
 * 邮件通讯 · 编辑一期：写标题和正文（可插入 {姓名}{公司}{上次参加的活动}）、选收件人、AI 起草；
 * 预览 → 发测试邮件给东哥 → 东哥点“确认发送”才群发（AI 草稿还要东哥先点“我已审核”）。
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Filters = { audience: 'all' | 'member' | 'registered'; eventTypes: string[]; industries: string[]; channels: string[] };
type Issue = { id: number; subject: string; body: string; source: string; status: string; filters: Filters; ai_reviewed_at: string | null; ai_reviewed_by: string | null; test_sent_at: string | null; test_sent_to: string | null; confirmed_at: string | null; confirmed_by: string | null; sent_at: string | null; recipient_count: number | null };
type Data = {
  sendError: { message: string; count: number } | null;
  issue: Issue;
  gate: { aiNeedsReview: boolean; testSentForThisVersion: boolean; canConfirm: boolean };
  recipients: number;
  samples: { email: string; subject: string; html: string }[];
  stats: Record<string, number>;
  quota: { leftToday: number; leftMonth: number; usedMonth: number; monthly: number };
  testTo: string | null;
};
type Opt = { key: string; label?: string; name?: string; n?: number };

export default function NewsletterIssue({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [d, setD] = useState<Data | null>(null);
  const [opts, setOpts] = useState<{ eventTypes: Opt[]; industries: Opt[]; channels: Opt[] } | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [filters, setFilters] = useState<Filters>({ audience: 'all', eventTypes: [], industries: [], channels: [] });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sample, setSample] = useState(0);
  const [testTo, setTestTo] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const r = await api<Data>(`/api/v1/staff/newsletter/${params.id}`);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setD(r.data);
    setSubject(r.data.issue.subject);
    setBody(r.data.issue.body);
    setFilters({ ...{ audience: 'all' as const, eventTypes: [] as string[], industries: [] as string[], channels: [] as string[] }, ...(r.data.issue.filters as Partial<Filters>) });
    setDirty(false);
  }, [params.id]);
  useEffect(() => {
    load();
    api<{ options: { eventTypes: Opt[]; industries: Opt[]; channels: Opt[] } }>('/api/v1/staff/newsletter').then((r) => r.ok && setOpts(r.data.options));
  }, [load]);

  async function save(silent = false) {
    const r = await api(`/api/v1/staff/newsletter/${params.id}`, { method: 'PATCH', body: { subject, body, filters } });
    if (!r.ok) { setMsg({ ok: false, text: r.message }); return false; }
    if (!silent) setMsg({ ok: true, text: '已保存' });
    await load();
    return true;
  }
  async function act(action: string, okText: (x: Record<string, unknown>) => string, extra: Record<string, unknown> = {}) {
    if (dirty && !(await save(true))) return;
    setBusy(action);
    const r = await api<Record<string, unknown>>(`/api/v1/staff/newsletter/${params.id}`, { body: { action, ...extra } });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: okText(r.data) } : { ok: false, text: r.message });
    load();
  }
  const insert = (t: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const a = el.selectionStart ?? body.length;
    const next = body.slice(0, a) + t + body.slice(el.selectionEnd ?? a);
    setBody(next);
    setDirty(true);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = a + t.length; });
  };
  const toggle = (k: 'eventTypes' | 'industries' | 'channels', v: string) => {
    setFilters((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
    setDirty(true);
  };

  const i = d?.issue;
  const draft = i?.status === 'draft';
  return (
    <StaffGate title="邮件通讯 · 编辑" role="ops" wide>
      {(s) => (
        <>
          <Msg m={msg} />
          {!d && <p className={styles.muted}>加载中…</p>}
          {d && i && (
            <>
              <p className={styles.small}>
                第 {i.id} 期 · {i.status === 'draft' ? '草稿' : i.status === 'sending' ? '发送中' : i.status === 'sent' ? `已发送（${fmtDateTime(i.sent_at!)}）` : i.status}
                {i.source === 'ai' ? ` · AI 起草${i.ai_reviewed_at ? `，${i.ai_reviewed_by} 已审核` : '，还没审核'}` : ''}
                {i.confirmed_at ? ` · ${i.confirmed_by} 于 ${fmtDateTime(i.confirmed_at)} 确认发送` : ''}
              </p>

              {/* 1. 内容 */}
              <h2 className={styles.h2}>1. 内容</h2>
              <div className={styles.card}>
                <label className={styles.label} htmlFor="nl-subject">标题</label>
                <input id="nl-subject" className={styles.input} value={subject} disabled={!draft} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} placeholder="例如：{姓名}，商会本周活动和研究" />
                <label className={styles.label} htmlFor="nl-body" style={{ marginTop: 12 }}>正文</label>
                <div className={styles.btnRow} style={{ marginBottom: 6 }}>
                  {['{姓名}', '{公司}', '{上次参加的活动}'].map((t) => <button key={t} className={`${styles.btn} ${styles.btnQuiet}`} disabled={!draft} onClick={() => insert(t)}>插入 {t}</button>)}
                </div>
                <textarea id="nl-body" ref={bodyRef} className={styles.textarea} style={{ minHeight: 320, fontFamily: 'inherit' }} value={body} disabled={!draft} onChange={(e) => { setBody(e.target.value); setDirty(true); }} />
                <p className={styles.small}>
                  排版：空一行分段；“## ”开头是小标题；“- ”开头是列表；**加粗**；[文字](https://链接)。
                  某一行用到的 {'{姓名}'}{'{公司}'}{'{上次参加的活动}'} 对这个人没有值时：正文第一行自动换成“您好，”，其它行整行不显示；标题里没有值的就去掉。
                  每封邮件末尾自动加一键退订和商会地址。
                </p>
                {draft && (
                  <div className={styles.btnRow}>
                    <button className={styles.btn} disabled={!dirty} onClick={() => save()}>保存</button>
                    <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!busy} onClick={() => { if (!body.trim() || window.confirm('AI 会根据本周网站文章和活动重写标题和正文，覆盖现在的内容。继续？')) act('ai', () => 'AI 已起草，请东哥审核内容'); }}>
                      {busy === 'ai' ? 'AI 起草中…' : '让 AI 根据本周文章和活动起草'}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. 收件人 */}
              <h2 className={styles.h2}>2. 收件人</h2>
              <div className={styles.card}>
                <div className={styles.chips}>
                  {([['all', '全部'], ['member', '只发会员'], ['registered', '只发注册用户（非会员）']] as const).map(([k, l]) => (
                    <button key={k} className={`${styles.chip} ${filters.audience === k ? styles.chipOn : ''}`} disabled={!draft} onClick={() => { setFilters({ ...filters, audience: k }); setDirty(true); }}>{l}</button>
                  ))}
                </div>
                {opts && (
                  <>
                    <p className={styles.label}>参加过的活动类型（不选 = 不限）</p>
                    <div className={styles.chips}>{opts.eventTypes.map((o) => <button key={o.key} className={`${styles.chip} ${filters.eventTypes.includes(o.key) ? styles.chipOn : ''}`} disabled={!draft} onClick={() => toggle('eventTypes', o.key)}>{o.name}</button>)}</div>
                    <p className={styles.label}>行业（不选 = 不限）</p>
                    <div className={styles.chips}>{opts.industries.map((o) => <button key={o.key} className={`${styles.chip} ${filters.industries.includes(o.key) ? styles.chipOn : ''}`} disabled={!draft} onClick={() => toggle('industries', o.key)}>{o.label}</button>)}</div>
                    <p className={styles.label}>渠道来源（不选 = 不限）</p>
                    <div className={styles.chips}>{opts.channels.map((o) => <button key={o.key} className={`${styles.chip} ${filters.channels.includes(o.key) ? styles.chipOn : ''}`} disabled={!draft} onClick={() => toggle('channels', o.key)}>{o.label} <span className={styles.small}>{o.n}</span></button>)}</div>
                  </>
                )}
                <p className={styles.cardTitle} style={{ marginTop: 12 }}>
                  {dirty ? '改了筛选或内容，保存后显示人数' : `符合条件：${d.recipients} 人`}
                </p>
                <p className={styles.small}>只算验证过邮箱、没有退订、没有退信或投诉的人。</p>
              </div>

              {/* 3. 预览 */}
              <h2 className={styles.h2}>3. 预览（按真实收件人个性化）</h2>
              <div className={styles.card}>
                {!d.samples.length && <p className={styles.muted}>没有符合条件的人，无法预览。</p>}
                {!!d.samples.length && (
                  <>
                    <div className={styles.chips}>{d.samples.map((x, k) => <button key={k} className={`${styles.chip} ${sample === k ? styles.chipOn : ''}`} onClick={() => setSample(k)}>{x.email}</button>)}</div>
                    <p className={styles.small}>标题：{d.samples[sample]?.subject}</p>
                    <iframe title="邮件预览" srcDoc={d.samples[sample]?.html} sandbox="" style={{ width: '100%', height: 520, border: '1px solid var(--line-3)', background: '#fff' }} />
                  </>
                )}
              </div>

              {/* 4. 发送闸门 */}
              <h2 className={styles.h2}>4. 审核、测试、确认发送</h2>
              <div className={styles.card}>
                <ol className={styles.small} style={{ paddingLeft: 18 }}>
                  {i.source === 'ai' && <li>{i.ai_reviewed_at ? `✓ AI 草稿已由 ${i.ai_reviewed_by} 审核` : 'AI 起草的内容要东哥先审核'}</li>}
                  <li>{d.gate.testSentForThisVersion ? `✓ 这一版的测试邮件已发到 ${i.test_sent_to}（${fmtDateTime(i.test_sent_at!)}）` : i.test_sent_at ? '内容改过了，请重新发测试邮件' : `先发一封测试邮件到 ${d.testTo ?? '（还没设置测试邮箱）'}`}</li>
                  <li>{i.confirmed_at ? (i.status === 'sent' ? '✓ 已确认并全部发出' : `✓ 已确认发送，还有 ${d.stats.queued} 封在队列里`) : '东哥看过测试邮件后，点“确认发送”才群发'}</li>
                </ol>
                {draft && (
                  <div className={styles.btnRow}>
                    {d.gate.aiNeedsReview && can(s, 'admin') && <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!busy || dirty} onClick={() => act('review', () => '已记录：AI 草稿已审核')}>我已审核这份 AI 草稿</button>}
                    <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!busy || d.gate.aiNeedsReview} onClick={() => act('test', (x) => `测试邮件已发到 ${x.to}，请查收`)}>{busy === 'test' ? '发送中…' : '发测试邮件给东哥'}</button>
                    {can(s, 'admin') ? (
                      <button
                        className={styles.btn}
                        disabled={!!busy || dirty || !d.gate.canConfirm}
                        onClick={() => {
                          if (window.confirm(`确认把这一期发给 ${d.recipients} 人？发出后不能撤回。`)) act('confirm', (x) => `已确认，开始发送：共 ${x.recipients} 人，已发 ${x.sent}${x.left ? `，剩 ${x.left} 封今天额度用完，明天自动接着发` : ''}`);
                        }}
                      >
                        {busy === 'confirm' ? '发送中…' : `确认发送（${d.recipients} 人）`}
                      </button>
                    ) : (
                      <p className={styles.small}>群发只能由东哥（管理员）确认。</p>
                    )}
                  </div>
                )}
                {d.sendError && <p className={styles.error}>有 {d.sendError.count} 封没发出去：{d.sendError.message}。系统每天会自动重试，也可以点“接着发剩下的”马上重试。</p>}
                {i.status === 'sending' && can(s, 'admin') && <button className={styles.btn} disabled={!!busy} onClick={() => act('resume', (x) => `又发出 ${x.sent} 封，还剩 ${x.left} 封`)}>接着发剩下的</button>}
                <p className={styles.small}>本月额度：已用 {d.quota.usedMonth} / {d.quota.monthly || '不限'}，群发还能用约 {Number.isFinite(d.quota.leftMonth) ? d.quota.leftMonth : '不限'} 封；今天还能发约 {Number.isFinite(d.quota.leftToday) ? d.quota.leftToday : '不限'} 封。</p>
                {can(s, 'admin') && draft && (
                  <div className={styles.inputRow}>
                    <input className={styles.input} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="改测试收件邮箱（东哥的 Gmail）" aria-label="测试收件邮箱" />
                    <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={!testTo.trim()} onClick={() => act('testTo', () => '测试收件邮箱已更新', { email: testTo.trim() })}>保存</button>
                  </div>
                )}
              </div>

              {/* 5. 统计 */}
              {i.status !== 'draft' && (
                <>
                  <h2 className={styles.h2}>5. 这一期的统计</h2>
                  <table className={styles.table}>
                    <thead><tr><th>收件人</th><th>已发</th><th>送达</th><th>打开</th><th>点击</th><th>退订</th><th>退信</th><th>投诉</th><th>没发（退订 / 失败）</th></tr></thead>
                    <tbody><tr><td>{d.stats.total}</td><td>{d.stats.sent}</td><td>{d.stats.delivered}</td><td>{d.stats.opened}</td><td>{d.stats.clicked}</td><td>{d.stats.unsubscribed}</td><td>{d.stats.bounced}</td><td>{d.stats.complained}</td><td>{d.stats.skipped} / {d.stats.failed}</td></tr></tbody>
                  </table>
                  <p className={styles.small}>打开数受邮箱隐私保护影响（比如苹果邮件会预先加载），只作参考；点击更准确。</p>
                </>
              )}
              {draft && (
                <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ marginTop: 24 }} onClick={async () => { if (!window.confirm('删除这一期草稿？')) return; const r = await api(`/api/v1/staff/newsletter/${params.id}`, { method: 'DELETE' }); if (r.ok) router.push('/zh/staff/newsletter'); else setMsg({ ok: false, text: r.message }); }}>
                  删除草稿
                </button>
              )}
            </>
          )}
        </>
      )}
    </StaffGate>
  );
}
