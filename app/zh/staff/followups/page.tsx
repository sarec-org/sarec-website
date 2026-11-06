'use client';
/**
 * 待跟进任务（SAREC 1.2 第 I 节）+ 待处理（失败 / 异常）
 * 每条：来源、需求、建议联系内容（草稿，人工确认后再发）、状态、负责人、下一步日期、处理记录。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';
import { laToday } from '@/lib/laDate';

type F = {
  id: string; source: string; name: string | null; contact_text: string | null; need: string | null; draft: string | null; draft_by: string;
  status: string; owner: string | null; next_date: string | null; created_at: string; notified_at: string | null; event_title: string | null; member_no: number | null;
};
type X = { id: string; kind: string; ref: string | null; error: string | null; attempts: number; status: string; created_at: string; updated_at: string };
type Log = { actor: string; from_status: string | null; to_status: string | null; note: string | null; created_at: string };

const SOURCE: Record<string, string> = { agent_lead: 'AI 助手线索', post_event_interest: '活动后希望了解', inquiry: '新咨询', expiring_member: '会员 30 天内到期', manual: '手动添加' };
const STATUS: Record<string, string> = { todo: '待联系', contacted: '已联系', meeting: '已约谈', won: '已成交', dropped: '暂不跟进' };
const KIND: Record<string, string> = { followup_email: '线索 / 咨询邮件通知', photo_notice: '“照片已上传”通知', photo_upload: '照片上传', followup_scan: '每日扫描', agent_digest: 'AI 助手日报', agent_lead_email: 'AI 线索邮件' };
const today = () => laToday();

function Item({ f, onChanged }: { f: F; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(f.status);
  const [owner, setOwner] = useState(f.owner ?? '');
  const [nextDate, setNextDate] = useState(f.next_date ?? '');
  const [note, setNote] = useState('');
  const [log, setLog] = useState<Log[] | null>(null);
  const [msg, setMsg] = useState('');
  const overdue = f.next_date && f.next_date < today() && !['won', 'dropped'].includes(f.status);

  async function loadLog() {
    const r = await api<{ log: Log[] }>(`/api/v1/staff/followups/${f.id}`);
    if (r.ok) setLog(r.data.log);
  }
  async function save() {
    setMsg('');
    const r = await api(`/api/v1/staff/followups/${f.id}`, { body: { status, owner, nextDate: nextDate || null, note } });
    if (!r.ok) return setMsg(r.message);
    setNote('');
    setMsg('已保存');
    loadLog();
    onChanged();
  }
  return (
    <div className={styles.card} style={{ borderColor: overdue ? '#e7a1a1' : undefined }}>
      <div className={styles.row} style={{ alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => { setOpen(!open); if (!log) loadLog(); }}>
        <div>
          <p className={styles.cardTitle} style={{ marginBottom: 4 }}>
            {f.name || '未留称呼'} <span className={styles.badge}>{SOURCE[f.source] ?? f.source}</span>{' '}
            <span className={`${styles.badge} ${['won'].includes(f.status) ? styles.badgeGreen : ['dropped'].includes(f.status) ? styles.badgeMuted : ''}`}>{STATUS[f.status]}</span>
            {overdue && <span className={`${styles.badge} ${styles.badgeRed}`}>已过下一步日期</span>}
          </p>
          <p className={styles.small} style={{ margin: 0 }}>{f.need || '—'}</p>
          <p className={styles.small} style={{ margin: '4px 0 0' }}>
            {f.contact_text || '未留联系方式'} · {fmtDateTime(f.created_at)}{f.owner ? ` · 负责人 ${f.owner}` : ''}{f.next_date ? ` · 下一步 ${f.next_date}` : ''}
            {f.notified_at ? ' · 已邮件通知' : ''}
          </p>
        </div>
        <span className={styles.small} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{open ? '收起' : '处理'}</span>
      </div>
      {open && (
        <div style={{ marginTop: '0.8rem' }}>
          {f.draft && (
            <div className={styles.notice}>
              <p className={styles.small} style={{ margin: '0 0 6px' }}>建议联系内容（{f.draft_by === 'ai' ? 'AI 草稿' : '模板草稿'}，请人工确认后再发）</p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{f.draft}</p>
              <button className={`${styles.btn} ${styles.btnQuiet}`} style={{ marginTop: 8 }} onClick={() => navigator.clipboard?.writeText(f.draft ?? '')}>复制草稿</button>
            </div>
          )}
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`st-${f.id}`}>状态</label>
              <select id={`st-${f.id}`} className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`ow-${f.id}`}>负责人</label>
              <input id={`ow-${f.id}`} className={styles.input} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="例如：助理小李" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`nd-${f.id}`}>下一步日期</label>
              <input id={`nd-${f.id}`} type="date" className={styles.input} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`no-${f.id}`}>处理备注</label>
              <input id={`no-${f.id}`} className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：已电话沟通，下周约见" />
            </div>
          </div>
          <div className={styles.btnRow}>
            <button className={styles.btn} onClick={save}>保存</button>
            {f.member_no ? <a className={`${styles.btn} ${styles.btnGhost}`} href={`/zh/staff/contacts?q=${f.member_no}`}>查看客户档案</a> : null}
          </div>
          {msg && <p className={msg === '已保存' ? styles.success : styles.error}>{msg}</p>}
          {log && log.length > 0 && (
            <div className={styles.list}>
              {log.map((l, i) => (
                <p key={i} className={styles.small} style={{ margin: '4px 0' }}>
                  {fmtDateTime(l.created_at)} · {l.actor.replace(/^staff:/, '')} · {STATUS[l.from_status ?? ''] ?? '—'} → {STATUS[l.to_status ?? ''] ?? '—'}{l.note ? ` · ${l.note}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Followups() {
  const [tab, setTab] = useState<'tasks' | 'exceptions'>('tasks');
  const [status, setStatus] = useState('todo');
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState<F[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [ex, setEx] = useState<X[] | null>(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', contactText: '', need: '', owner: '', nextDate: '' });

  const load = useCallback(async () => {
    setErr('');
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (source) p.set('source', source);
    if (q.trim()) p.set('q', q.trim());
    const r = await api<{ followups: F[]; counts: Record<string, number> }>(`/api/v1/staff/followups?${p}`);
    if (r.ok) { setList(r.data.followups); setCounts(r.data.counts); } else setErr(r.message);
    const x = await api<{ exceptions: X[] }>('/api/v1/staff/exceptions?status=open');
    if (x.ok) setEx(x.data.exceptions);
  }, [status, source, q]);
  useEffect(() => { load(); }, [load]);

  async function exAction(id: string, action: 'retry' | 'ignore') {
    const r = await api<{ ok: boolean; message: string }>('/api/v1/staff/exceptions', { body: { id, action } });
    setErr(r.ok ? r.data.message : r.message);
    load();
  }
  async function add() {
    const r = await api('/api/v1/staff/followups', { body: form });
    if (!r.ok) return setErr(r.message);
    setAdding(false);
    setForm({ name: '', contactText: '', need: '', owner: '', nextDate: '' });
    load();
  }

  return (
    <>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'tasks' ? styles.tabOn : ''}`} onClick={() => setTab('tasks')}>待跟进任务（待联系 {counts.todo ?? 0}）</button>
        <button className={`${styles.tab} ${tab === 'exceptions' ? styles.tabOn : ''}`} onClick={() => setTab('exceptions')}>待处理（失败 / 异常 {ex?.length ?? 0}）</button>
      </div>
      {err && <p className={styles.error} role="alert">{err}</p>}

      {tab === 'tasks' && (
        <>
          <div className={styles.chips}>
            {[['', '全部'], ...Object.entries(STATUS)].map(([k, v]) => (
              <button key={k} className={`${styles.chip} ${status === k ? styles.chipOn : ''}`} onClick={() => setStatus(k)}>{v}{k && counts[k] ? ` ${counts[k]}` : ''}</button>
            ))}
          </div>
          <div className={styles.inputRow}>
            <select className={styles.select} value={source} onChange={(e) => setSource(e.target.value)} aria-label="来源">
              <option value="">全部来源</option>
              {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索称呼 / 联系方式 / 需求" aria-label="搜索" />
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setAdding(!adding)}>{adding ? '取消' : '手动添加'}</button>
          </div>
          {adding && (
            <div className={styles.card}>
              <div className={styles.grid2}>
                {([['name', '称呼'], ['contactText', '联系方式'], ['need', '需求'], ['owner', '负责人']] as const).map(([k, l]) => (
                  <div key={k} className={styles.field}>
                    <label className={styles.label} htmlFor={`add-${k}`}>{l}</label>
                    <input id={`add-${k}`} className={styles.input} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                  </div>
                ))}
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="add-nd">下一步日期</label>
                  <input id="add-nd" type="date" className={styles.input} value={form.nextDate} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} />
                </div>
              </div>
              <button className={styles.btn} onClick={add}>添加</button>
            </div>
          )}
          {list === null ? <p className={styles.muted}>加载中…</p> : list.length === 0 ? <p className={styles.muted}>没有符合条件的任务。</p> : list.map((f) => <Item key={f.id} f={f} onChanged={load} />)}
        </>
      )}

      {tab === 'exceptions' && (
        <>
          <p className={styles.small}>发送失败、上传失败等都在这里。点“重试”会再执行一次，已经成功的部分不会重复发送、重复报名或重复计分。</p>
          {ex === null ? <p className={styles.muted}>加载中…</p> : ex.length === 0 ? <p className={styles.success}>没有待处理的异常。</p> : (
            <table className={styles.table}>
              <thead><tr><th>类型</th><th>说明</th><th>次数</th><th>最近</th><th /></tr></thead>
              <tbody>
                {ex.map((x) => (
                  <tr key={x.id}>
                    <td>{KIND[x.kind] ?? x.kind}</td>
                    <td className={styles.small}>{x.error}</td>
                    <td>{x.attempts}</td>
                    <td className={styles.small}>{fmtDateTime(x.updated_at)}</td>
                    <td>
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => exAction(x.id, 'retry')}>重试</button>{' '}
                      <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => exAction(x.id, 'ignore')}>不处理</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="待跟进任务" wide>
      {() => <Followups />}
    </StaffGate>
  );
}
