'use client';
/**
 * 后台「代登记接活人」（后台优化 D，指令 13 第 3 条）：工作人员替认识的师傅登记接活儿。
 * 三块：一个一个填 / 一次贴一张表（先预览每行会怎样、会不会被拒，确认后才写）/ 已代登记的人（确认短信状态、重发）。
 * 资质规则和本人登记完全一样；写入后照常核验（在「接活人核验」里处理）。“商会代登记”只在后台显示。
 * 确认短信走发消息总闸：总闸关着只记录，不真发。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can, type StaffInfo } from '@/components/crm/staff/StaffGate';
import { api, copyText, fmtDateTime } from '@/components/crm/client';
import { PhotoPicker } from '@/components/jobs/PhotoPicker';

type Checked = {
  line: number | null; ok: boolean; action: 'create' | 'link' | 'duplicate' | 'reject'; errors: string[]; notes: string[]; outcome: string;
  data: { name: string; phone: string | null; roleLabel: string | null; trades: { key: string; name: string }[]; cities: { key: string; name: string }[]; years: number | null; licenseNo: string | null; businessRegNo: string | null; intro: string | null };
};
type Item = {
  id: string; name: string; roleLabel: string; phone: string | null; status: string; statusLabel: string; needsReview: boolean; listed: boolean; trades: string[]; cities: string[];
  licenseNo: string | null; businessRegNo: string | null; proxyBy: string; proxyAt: string; sms: string; smsLabel: string; smsAt: string | null; confirmedAt: string | null; confirmedVia: string | null;
};
type ListRes = {
  items: Item[]; settings: { notifyLive: boolean; testSite: boolean; listBeforeConfirm: boolean }; columns: string[]; header: string; sample: string; help: string[]; smsTemplate: string;
  roles: { key: string; label: string }[];
};
type Meta = { trades: { key: string; name: string; group: string; open: boolean; licType: string }[]; groups: { key: string; name: string }[]; cities: { region: string; items: { key: string; name: string }[] }[] };
type M = { ok: boolean; text: string } | null;

export default function StaffJobsProxy() {
  return (
    <StaffGate title="代登记接活人" role="ops" wide>
      {(s) => <Proxy staff={s} />}
    </StaffGate>
  );
}

const TABS = [['one', '一个一个填'], ['batch', '一次贴一张表'], ['list', '已代登记的人']] as const;

function Proxy({ staff }: { staff: StaffInfo }) {
  const [tab, setTab] = useState<string>('one');
  const [list, setList] = useState<ListRes | null>(null);
  const [msg, setMsg] = useState<M>(null);
  const load = useCallback(async () => {
    const r = await api<ListRes>('/api/v1/workbench/jobs/proxy');
    if (r.ok) setList(r.data); else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      <p className={styles.small}>替认识的师傅登记接活儿。资格要求和师傅自己登记完全一样：要牌照的工种没牌照号照样登记不上。登记后照常核验（到「接活人核验」处理），核验通过就上找工人列表。</p>
      {list && (
        <div className={styles.notice}>
          {list.settings.testSite ? '测试站：确认短信只发给测试号码，其他人只记录“本该发给谁、发什么”，不真发。' : list.settings.notifyLive ? '发消息总闸开着：确认短信会真发给本人。' : '发消息总闸关着：确认短信只记录“本该发给谁、发什么”，不真发。打开总闸要东哥点头。'}
        </div>
      )}
      <div className={styles.tabs}>
        {TABS.map(([k, l]) => (
          <button key={k} className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`} onClick={() => setTab(k)}>
            {l}{k === 'list' && list ? `（${list.items.length}）` : ''}
          </button>
        ))}
      </div>
      <Msg m={msg} />
      {tab === 'one' && <One onSaved={load} />}
      {tab === 'batch' && list && <Batch list={list} onSaved={load} />}
      {tab === 'list' && list && <List list={list} reload={load} staff={staff} />}
      {!list && <p className={styles.muted}>正在加载…</p>}
    </>
  );
}

// ── 一个一个填 ─────────────────────────────────────────────────────────
type Form = { role: string; name: string; phone: string; trades: string[]; cities: string[]; years: string; licenseNo: string; businessRegNo: string; businessRegUrl: string; insuranceUrl: string; intro: string; wechat: string };
const EMPTY: Form = { role: '', name: '', phone: '', trades: [], cities: [], years: '', licenseNo: '', businessRegNo: '', businessRegUrl: '', insuranceUrl: '', intro: '', wechat: '' };
const ROLES = [['company', '施工队或公司'], ['licensed', '持牌师傅'], ['pro_service', '设计与专业服务'], ['worker', '工人']] as const;

function One({ onSaved }: { onSaved: () => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [q, setQ] = useState('');
  const [check, setCheck] = useState<Checked | null>(null);
  const [sendSms, setSendSms] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<M>(null);
  useEffect(() => { api<Meta>('/api/v1/jobs/meta').then((r) => r.ok && setMeta(r.data)); }, []);
  const set = (p: Partial<Form>) => { setF({ ...f, ...p }); setCheck(null); };
  const toggle = (k: 'trades' | 'cities', v: string) => set({ [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] } as Partial<Form>);
  const trades = useMemo(() => (meta?.trades ?? []).filter((t) => t.open && (!q.trim() || t.name.includes(q.trim()))), [meta, q]);
  const tName = (k: string) => meta?.trades.find((t) => t.key === k)?.name ?? k;
  const needC = f.trades.some((k) => meta?.trades.find((t) => t.key === k)?.licType === 'C');
  const row = { ...f, businessRegUrl: f.businessRegUrl || undefined, insuranceUrl: f.insuranceUrl || undefined };
  async function go(mode: 'preview' | 'save') {
    setBusy(true); setMsg(null);
    const r = await api<{ row: Checked; saved?: boolean; error?: string | null; sms?: { label: string; why: string | null } | null }>('/api/v1/workbench/jobs/proxy', { body: { mode, row, sendSms } });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setCheck(r.data.row);
    if (mode === 'save') {
      if (r.data.saved) {
        setMsg({ ok: true, text: `已登记「${r.data.row.data.name}」，进了「接活人核验」。确认短信：${r.data.sms ? `${r.data.sms.label}${r.data.sms.why ? `（${r.data.sms.why}）` : ''}` : '没发'}` });
        setF(EMPTY); setCheck(null); onSaved();
      } else setMsg({ ok: false, text: r.data.error ?? '没有写入：先把下面的问题改好' });
    }
  }
  return (
    <div className={styles.card}>
      <Msg m={msg} />
      <div className={styles.field}>
        <span className={styles.label}>身份</span>
        <div className={styles.chips}>{ROLES.map(([k, l]) => <button key={k} type="button" className={`${styles.chip} ${f.role === k ? styles.chipOn : ''}`} onClick={() => set({ role: k })}>{l}</button>)}</div>
      </div>
      <label className={styles.field}><span className={styles.label}>姓名或公司名称</span><input className={styles.input} value={f.name} onChange={(e) => set({ name: e.target.value })} /></label>
      <label className={styles.field}><span className={styles.label}>手机号（美国号码 10 位；中国号码前面加 +86）</span><input className={styles.input} inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></label>
      <div className={styles.field}>
        <span className={styles.label}>能做的工种{f.trades.length ? `：${f.trades.map(tName).join('、')}` : ''}</span>
        <input className={styles.input} placeholder="输入几个字找工种，例如 水管" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className={styles.chips} style={{ marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>
          {trades.map((t) => <button key={t.key} type="button" className={`${styles.chip} ${f.trades.includes(t.key) ? styles.chipOn : ''}`} onClick={() => toggle('trades', t.key)}>{t.name}</button>)}
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>服务城市</span>
        {(meta?.cities ?? []).map((g) => (
          <div key={g.region} style={{ marginBottom: 6 }}>
            <span className={styles.small}>{g.region}</span>
            <div className={styles.chips}>{g.items.map((c) => <button key={c.key} type="button" className={`${styles.chip} ${f.cities.includes(c.key) ? styles.chipOn : ''}`} onClick={() => toggle('cities', c.key)}>{c.name}</button>)}</div>
          </div>
        ))}
      </div>
      <label className={styles.field}><span className={styles.label}>从业年限（选填）</span><input className={styles.input} inputMode="numeric" value={f.years} onChange={(e) => set({ years: e.target.value })} /></label>
      {f.role !== 'worker' && (
        <>
          <label className={styles.field}><span className={styles.label}>牌照号 / 执照号（施工队、持牌师傅、要州执照的工种必填）</span><input className={styles.input} value={f.licenseNo} onChange={(e) => set({ licenseNo: e.target.value })} /></label>
          {(needC || f.role === 'pro_service') && (
            <>
              <label className={styles.field}><span className={styles.label}>营业登记号（只要营业登记的工种：填号码或传照片，二选一）</span><input className={styles.input} value={f.businessRegNo} onChange={(e) => set({ businessRegNo: e.target.value })} /></label>
              <div className={styles.field}><span className={styles.label}>营业登记照片（选填）</span><PhotoPicker photos={f.businessRegUrl ? [f.businessRegUrl] : []} max={1} label="拍照 / 上传" endpoint="/api/v1/jobs/me/pro/photo?kind=bizreg" onChange={(p) => set({ businessRegUrl: p[0] ?? '' })} /></div>
              <div className={styles.field}><span className={styles.label}>责任保险（选填）</span><PhotoPicker photos={f.insuranceUrl ? [f.insuranceUrl] : []} max={1} label="拍照 / 上传" endpoint="/api/v1/jobs/me/pro/photo?kind=insurance" onChange={(p) => set({ insuranceUrl: p[0] ?? '' })} /></div>
            </>
          )}
        </>
      )}
      <label className={styles.field}><span className={styles.label}>介绍（选填，300 字内）</span><textarea className={styles.textarea} value={f.intro} onChange={(e) => set({ intro: e.target.value })} /></label>
      <label className={styles.field}><span className={styles.label}>微信号（选填）</span><input className={styles.input} value={f.wechat} onChange={(e) => set({ wechat: e.target.value })} /></label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 40 }}>
        <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />登记后给本人发确认短信（总闸关着只记录不发）
      </label>
      {check && <RowView r={check} />}
      <div className={styles.btnRow} style={{ marginTop: 10 }}>
        <button className={`${styles.btn} ${styles.btnGhost}`} disabled={busy} onClick={() => go('preview')}>先检查</button>
        <button className={styles.btn} disabled={busy || !check?.ok} onClick={() => go('save')}>{check?.ok ? '确认登记' : '检查通过后才能登记'}</button>
      </div>
    </div>
  );
}

// ── 一行的检查结果 ─────────────────────────────────────────────────────
function RowView({ r }: { r: Checked }) {
  const tone = r.ok ? styles.success : r.action === 'duplicate' ? styles.notice : styles.error;
  const tag = r.ok ? (r.action === 'link' ? '能登记（挂到已有档案）' : '能登记') : r.action === 'duplicate' ? '已登记过，不重复建' : '会被拒';
  return (
    <div className={tone} style={{ margin: '0.5rem 0' }}>
      <b>{r.line ? `第 ${r.line} 行 · ` : ''}{r.data.name || '（没填姓名）'}：{tag}</b>
      <div className={styles.small} style={{ color: 'inherit' }}>
        {[r.data.roleLabel, r.data.phone, r.data.trades.map((t) => t.name).join('、'), r.data.cities.map((c) => c.name).join('、'), r.data.years != null ? `${r.data.years} 年` : null].filter(Boolean).join(' · ')}
      </div>
      {r.errors.map((e) => <div key={e} className={styles.small} style={{ color: 'inherit' }}>✗ {e}</div>)}
      {r.notes.map((e) => <div key={e} className={styles.small} style={{ color: 'inherit' }}>· {e}</div>)}
      <div className={styles.small} style={{ color: 'inherit' }}>→ {r.outcome}</div>
    </div>
  );
}

// ── 一次贴一张表 ───────────────────────────────────────────────────────
type BatchRes = { headerFound: boolean; columns: string[]; rows: Checked[]; summary: { total: number; willSave: number; rejected: number; duplicate: number; linked: number }; results?: { line: number | null; name: string; saved: boolean; error: string | null; sms: string | null }[]; saved?: number };
function Batch({ list, onSaved }: { list: ListRes; onSaved: () => void }) {
  const [text, setText] = useState('');
  const [res, setRes] = useState<BatchRes | null>(null);
  const [sendSms, setSendSms] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<M>(null);
  async function go(mode: 'preview' | 'save') {
    setBusy(true); setMsg(null);
    const r = await api<BatchRes>('/api/v1/workbench/jobs/proxy/batch', { body: { text, mode, confirm: mode === 'save', sendSms } });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setRes(r.data);
    if (mode === 'save') {
      setMsg({ ok: true, text: `写入了 ${r.data.saved ?? 0} 人，都进了「接活人核验」；被拒和已登记过的行没写。` });
      onSaved();
    }
  }
  return (
    <div className={styles.card}>
      <Msg m={msg} />
      {list.help.map((h) => <p key={h} className={styles.small} style={{ margin: '0 0 0.4rem' }}>{h}</p>)}
      <p className={styles.small} style={{ margin: '0.6rem 0 0.3rem' }}>表头（可以复制到 Excel 第一行，用 Tab 隔开）：</p>
      <div className={styles.mono} style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{list.columns.join(' ｜ ')}</div>
      <div className={styles.btnRow} style={{ margin: '0.5rem 0' }}>
        <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={async () => setMsg((await copyText(list.header)) ? { ok: true, text: '已复制表头（8 列，用 Tab 隔开），贴进 Excel 第一行就分好列了' } : { ok: false, text: '没复制上，请手动选中复制' })}>复制表头</button>
        <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={async () => setMsg((await copyText(list.sample)) ? { ok: true, text: '已复制示例表（表头 + 3 行示例），贴进 Excel 看格式' } : { ok: false, text: '没复制上，请手动选中复制' })}>复制示例表</button>
        <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => { setText(list.sample); setRes(null); }}>把示例填进下面看看</button>
      </div>
      <textarea className={styles.textarea} style={{ minHeight: 180 }} placeholder={'把表格整块贴到这里（含第一行列名）'} value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 40 }}>
        <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />写入后给每人发确认短信（总闸关着只记录不发）
      </label>
      <div className={styles.btnRow}>
        <button className={`${styles.btn} ${styles.btnGhost}`} disabled={busy || !text.trim()} onClick={() => go('preview')}>预览</button>
        {res && !res.results && <button className={styles.btn} disabled={busy || res.summary.willSave === 0} onClick={() => go('save')}>{res.summary.willSave ? `确认写入 ${res.summary.willSave} 人` : '没有能写入的行'}</button>}
      </div>
      {res && (
        <>
          <p className={styles.small} style={{ marginTop: 10 }}>
            {res.headerFound ? '认出了表头' : '没认出表头，按默认顺序读'}：{res.columns.join('、')}。共 {res.summary.total} 行：能登记 {res.summary.willSave}（其中挂到已有档案 {res.summary.linked}），会被拒 {res.summary.rejected}，已登记过 {res.summary.duplicate}。
          </p>
          {res.results ? res.results.map((x) => (
            <div key={`${x.line}-${x.name}`} className={x.saved ? styles.success : styles.error} style={{ margin: '0.3rem 0' }}>
              第 {x.line} 行 · {x.name || '（没填姓名）'}：{x.saved ? `已写入${x.sms ? `，确认短信${x.sms === 'logged' ? '已记录待发' : x.sms === 'sent' ? '已发' : '发送失败'}` : ''}` : `没写入（${x.error}）`}
            </div>
          )) : res.rows.map((r) => <RowView key={`${r.line}`} r={r} />)}
        </>
      )}
    </div>
  );
}

// ── 已代登记的人 ───────────────────────────────────────────────────────
function List({ list, reload, staff }: { list: ListRes; reload: () => void; staff: StaffInfo }) {
  const [msg, setMsg] = useState<M>(null);
  const [busy, setBusy] = useState(false);
  async function sms(body: Record<string, unknown>) {
    setBusy(true);
    const r = await api<{ total: number; sent: number; logged: number; failed: number; skipped: number; live: boolean }>('/api/v1/workbench/jobs/proxy/sms', { body });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    const d = r.data;
    setMsg({ ok: true, text: `已发 ${d.sent} 条，只记录没真发 ${d.logged} 条${d.failed ? `，发送失败 ${d.failed} 条` : ''}${d.skipped ? `，跳过 ${d.skipped} 条（已确认）` : ''}${d.live ? '' : '（总闸关着或测试站：只记录不真发）'}` });
    reload();
  }
  async function setListing(v: boolean) {
    const r = await api('/api/v1/workbench/jobs/proxy', { method: 'PATCH', body: { listBeforeConfirm: v } });
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: v ? '已改成：核验通过就上列表（不等本人确认）' : '已改成：代登记的人要等本人确认后才上列表' });
    reload();
  }
  const pending = list.items.filter((x) => ['none', 'logged', 'failed'].includes(x.sms)).length;
  return (
    <>
      <Msg m={msg} />
      <div className={styles.card}>
        <p className={styles.small} style={{ margin: 0 }}>确认短信原文：</p>
        <p style={{ margin: '0.3rem 0 0.6rem' }}>{list.smsTemplate}</p>
        <p className={styles.small} style={{ margin: 0 }}>
          没本人确认前上不上找工人列表：<b>{list.settings.listBeforeConfirm ? '核验通过就上（和本人登记一样）' : '等本人确认后才上'}</b>
          {can(staff, 'admin') && <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} style={{ marginLeft: 8 }} onClick={() => setListing(!list.settings.listBeforeConfirm)}>{list.settings.listBeforeConfirm ? '改成等本人确认' : '改成核验通过就上'}</button>}
        </p>
        {pending > 0 && <button className={`${styles.btn} ${styles.btnBlock}`} style={{ marginTop: 10 }} disabled={busy} onClick={() => sms({ pending: true })}>把没确认的 {pending} 人的确认短信都发一遍</button>}
      </div>
      {list.items.length === 0 && <p className={styles.muted}>还没有代登记的人。</p>}
      {list.items.map((p) => (
        <div key={p.id} className={styles.card}>
          <div>
            <b>{p.name}</b> · {p.roleLabel} <span className={styles.badge}>{p.needsReview ? '待再看' : p.statusLabel}</span>
            <span className={`${styles.badge} ${styles.badgeMuted}`}>商会代登记</span>
            <span className={`${styles.badge} ${p.sms === 'confirmed' ? styles.badgeGreen : p.sms === 'declined' || p.sms === 'failed' ? styles.badgeRed : styles.badgeMuted}`}>确认短信：{p.smsLabel}</span>
            {p.listed && <span className={`${styles.badge} ${styles.badgeGreen}`}>在列表上</span>}
          </div>
          <div className={styles.small}>{p.phone ?? '没有手机号'} · {p.trades.join('、')} · {p.cities.join('、')}</div>
          <div className={styles.small}>
            {p.licenseNo ? <>牌照 / 执照号 <span className={styles.mono}>{p.licenseNo}</span> · </> : null}
            {p.businessRegNo ? <>营业登记号 <span className={styles.mono}>{p.businessRegNo}</span> · </> : null}
            {p.proxyBy} 代登记于 {fmtDateTime(p.proxyAt)}
            {p.smsAt ? ` · 短信 ${fmtDateTime(p.smsAt)}` : ''}
            {p.confirmedAt ? ` · 本人确认 ${fmtDateTime(p.confirmedAt)}（${p.confirmedVia}）` : ''}
          </div>
          {['none', 'logged', 'failed'].includes(p.sms) && (
            <div className={styles.btnRow} style={{ marginTop: 6 }}>
              <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy} onClick={() => sms({ ids: [p.id] })}>{p.sms === 'none' ? '发确认短信' : '重发确认短信'}</button>
              <a className={`${styles.btn} ${styles.btnQuiet}`} href="/zh/staff/jobs/pros">去核验 ›</a>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
