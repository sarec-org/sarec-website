'use client';
/**
 * 1.5.0 群发（运营选人、写内容；只有管理员能确认）。三步：
 * 1) 选人：条件面板（条件之间“并且”，同一条件里多选“或者”），实时“选中 N 人”和三个渠道能发到几个；名单里可以一个个去掉；能存成常用人群、一键套用。
 * 2) 写内容：短信 / 邮件 / 微信服务通知（可多选），短信显示字数、条数、预计费用。
 * 3) 先发一条给东哥本人预览 → 预览过才出现「确认群发」（只有管理员能点）。
 * 这一版服务器一律演练：只记录“本来会发给谁”，不会真的发出任何消息。
 */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate, can, type StaffInfo } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';
import { Toast } from '@/components/crm/staff/ugcShared';

type FieldDef = { key: string; label: string; options: { value: string; label: string }[]; multi: boolean; hint?: string };
type Cond = { field: string; values: string[] };
type Audience = { id: string; name: string; filters: { conds: Cond[] }; created_by: string; created_at: string };
type Counts = { total?: number; sms?: number; email?: number; wechat?: number; result?: Record<string, { would: number; skipped: number }> };
type Broadcast = { id: string; channels: string[]; content: Record<string, string>; status: string; dry_run: boolean; counts: Counts; created_by: string; created_at: string; previewed_at: string | null; confirmed_by: string | null; confirmed_at: string | null };
type Person = { id: string; name: string | null; member_no: number | null; region: string | null; phone: boolean; email: boolean };
type Reach = { n: number; note: string };
type Aud = { total: number; reach: { sms: Reach; email: Reach; wechat: Reach }; smsCn: number; list: Person[] };
type Estimate = { people: number; segments: number; messages: number; usd: number };
type Recip = { channel: string; result: string; name: string | null; member_no: number | null };

const CH: { key: 'sms' | 'email' | 'wechat'; label: string }[] = [
  { key: 'sms', label: '短信' },
  { key: 'email', label: '邮件' },
  { key: 'wechat', label: '微信服务通知' }
];
const CH_NAME: Record<string, string> = { sms: '短信', email: '邮件', wechat: '微信服务通知' };
const STATUS: Record<string, string> = { draft: '草稿（还没预览）', previewed: '已预览，等管理员确认', sent: '已确认' };
const segs = (t: string) => Math.max(1, Math.ceil(Array.from(t).length / 70));

function useDebounced<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

function BroadcastDesk({ staff }: { staff: StaffInfo }) {
  const admin = can(staff, 'admin');
  const [catalog, setCatalog] = useState<FieldDef[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [records, setRecords] = useState<Broadcast[]>([]);
  const [dryRun, setDryRun] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);

  // 第一步
  const [conds, setConds] = useState<Cond[]>([]);
  const [excluded, setExcluded] = useState<{ id: string; name: string }[]>([]);
  const [aud, setAud] = useState<Aud | null>(null);
  const [audBusy, setAudBusy] = useState(false);
  const [showList, setShowList] = useState(false);
  const [audName, setAudName] = useState('');
  const [pickAud, setPickAud] = useState('');
  // 第二步
  const [channels, setChannels] = useState<string[]>([]);
  const [sms, setSms] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [wechat, setWechat] = useState('');
  const [est, setEst] = useState<Estimate | null>(null);
  // 第三步
  const [bid, setBid] = useState<{ id: string; sig: string } | null>(null);
  const [previewMsg, setPreviewMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<string>('');
  // 记录
  const [openRec, setOpenRec] = useState('');
  const [recips, setRecips] = useState<Recip[] | null>(null);

  const loadAll = useCallback(async () => {
    const r = await api<{ catalog: FieldDef[]; audiences: Audience[]; broadcasts: Broadcast[]; dryRun: boolean }>('/api/v1/staff/broadcast');
    if (r.ok) { setCatalog(r.data.catalog); setAudiences(r.data.audiences); setRecords(r.data.broadcasts); setDryRun(r.data.dryRun); setLoaded(true); } else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const filters = useMemo(() => ({ conds: conds.filter((c) => c.field && c.values.length) }), [conds]);
  const exIds = useMemo(() => excluded.map((x) => x.id), [excluded]);
  const audKey = useDebounced(JSON.stringify({ filters, exIds }), 350);
  const seq = useRef(0);
  useEffect(() => {
    if (!loaded) return;
    const { filters: f, exIds: ex } = JSON.parse(audKey);
    const n = ++seq.current;
    setAudBusy(true);
    api<Aud>('/api/v1/staff/broadcast', { body: { action: 'audience', filters: f, excluded: ex } }).then((r) => {
      if (n !== seq.current) return;
      setAudBusy(false);
      if (r.ok) setAud(r.data); else setMsg({ ok: false, text: `选人没算出来：${r.message}` });
    });
  }, [audKey, loaded]);

  const smsOn = channels.includes('sms');
  const estKey = useDebounced(smsOn ? JSON.stringify({ filters, exIds, sms }) : '', 500);
  useEffect(() => {
    if (!estKey) { setEst(null); return; }
    const { filters: f, exIds: ex, sms: t } = JSON.parse(estKey);
    api<Estimate>('/api/v1/staff/broadcast', { body: { action: 'estimate', filters: f, excluded: ex, text: t } }).then((r) => r.ok && setEst(r.data));
  }, [estKey]);

  const content = { sms, emailSubject: subject, emailBody, wechat };
  const sig = JSON.stringify({ filters, exIds, channels: [...channels].sort(), content });
  const previewed = !!bid && bid.sig === sig && !!previewMsg;

  const missing: string[] = [];
  if (!aud || aud.total === 0) missing.push('第一步还没选到人');
  if (!channels.length) missing.push('第二步至少选一个渠道');
  if (smsOn && !sms.trim()) missing.push('短信内容没写');
  if (channels.includes('email') && (!subject.trim() || !emailBody.trim())) missing.push('邮件标题和正文都要写');
  if (channels.includes('wechat') && !wechat.trim()) missing.push('微信服务通知那句话没写');

  const used = new Set(conds.map((c) => c.field));
  const def = (k: string) => catalog.find((x) => x.key === k);
  const setCond = (i: number, c: Partial<Cond>) => setConds((xs) => xs.map((x, j) => (j === i ? { ...x, ...c } : x)));

  function toggleValue(i: number, v: string) {
    const c = conds[i];
    const d = def(c.field);
    const on = c.values.includes(v);
    setCond(i, { values: on ? c.values.filter((x) => x !== v) : d?.multi ? [...c.values, v] : [v] });
  }
  async function saveAud() {
    if (!filters.conds.length) return setMsg({ ok: false, text: '还没设条件，没有可存的（全部人不用存）' });
    const r = await api<{ message: string }>('/api/v1/staff/broadcast', { body: { action: 'save_audience', name: audName, filters } });
    setMsg(r.ok ? { ok: true, text: `${r.data.message}（以后在“常用人群”里一键套用；手动去掉的人不存）` } : { ok: false, text: r.message });
    if (r.ok) { setAudName(''); loadAll(); }
  }
  function applyAud(id: string) {
    setPickAud(id);
    const a = audiences.find((x) => x.id === id);
    if (!a) return;
    setConds((a.filters?.conds ?? []).map((c) => ({ field: c.field, values: [...c.values] })));
    setExcluded([]);
    setMsg({ ok: true, text: `已套用常用人群「${a.name}」，人数正在重新算` });
  }
  async function preview() {
    setBusy('preview');
    setMsg(null);
    setResult('');
    let id = bid && bid.sig === sig ? bid.id : '';
    if (!id) {
      const c: Record<string, string> = {};
      if (smsOn) c.sms = sms;
      if (channels.includes('email')) { c.emailSubject = subject; c.emailBody = emailBody; }
      if (channels.includes('wechat')) c.wechat = wechat;
      const r = await api<{ id: string; total: number }>('/api/v1/staff/broadcast', { body: { action: 'create', filters, excluded: exIds, channels, content: c } });
      if (!r.ok) { setBusy(''); return setMsg({ ok: false, text: r.message }); }
      id = r.data.id;
    }
    const p = await api<{ message: string }>('/api/v1/staff/broadcast', { body: { action: 'preview', id } });
    setBusy('');
    setBid({ id, sig });
    if (p.ok) { setPreviewMsg(p.data.message); setMsg({ ok: true, text: '预览已处理，看下面的说明' }); } else setMsg({ ok: false, text: p.message });
    loadAll();
  }
  async function confirm() {
    if (!bid) return;
    setBusy('confirm');
    const r = await api<{ message: string; results: Record<string, { would: number; skipped: number }> }>('/api/v1/staff/broadcast', { body: { action: 'confirm', id: bid.id } });
    setBusy('');
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    const parts = Object.entries(r.data.results).map(([ch, x]) => `${CH_NAME[ch] ?? ch}本来会发给 ${x.would} 人、发不到 ${x.skipped} 人`);
    setResult(`${r.data.message}${parts.length ? '\n' + parts.join('；') : ''}`);
    setMsg({ ok: true, text: '已确认，结果见下面「群发记录」最上面一条' });
    setBid(null);
    setPreviewMsg('');
    loadAll();
  }
  async function showRecips(id: string) {
    if (openRec === id) { setOpenRec(''); return; }
    setOpenRec(id);
    setRecips(null);
    const r = await api<{ rows: Recip[] }>('/api/v1/staff/broadcast', { body: { action: 'recipients', id } });
    if (r.ok) setRecips(r.data.rows); else { setMsg({ ok: false, text: r.message }); setOpenRec(''); }
  }

  if (!loaded) return <><Toast m={msg} onClose={closeMsg} /><p className={styles.muted}>正在加载…</p></>;

  return (
    <>
      {dryRun && (
        <div role="alert" style={{ background: '#8a5a00', color: '#fff', padding: '0.9rem 1rem', borderRadius: 8, margin: '0 0 1rem', fontWeight: 600, lineHeight: 1.6 }}>
          现在是演练模式：只记录本来会发给谁，不会真的发出任何短信、邮件、微信通知
        </div>
      )}
      <p className={styles.small} style={{ marginTop: 0 }}>
        现有的「<Link href="/zh/staff/newsletter" style={{ color: 'var(--gold)' }}>邮件通讯</Link>」以后作为群发的邮件渠道并进来，名字和入口等东哥定；现在两个页面都能用。
      </p>
      <Toast m={msg} onClose={closeMsg} />

      {/* 第一步 */}
      <section className={`${styles.card} ${styles.cardGold}`}>
        <p className={styles.cardTitle}>第一步 · 选人</p>
        <p className={styles.small} style={{ marginTop: 0 }}><strong>条件之间是“并且”</strong>（都要满足），<strong>同一条件里多选是“或者”</strong>（满足其一）。一个条件都不加 = 所有人。</p>

        <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--ink-deepest, #020610)', padding: '0.6rem 0', borderBottom: '1px solid var(--line-2)', marginBottom: '0.8rem' }} aria-live="polite">
          <div style={{ fontSize: '1.35rem', fontFamily: 'var(--serif-zh)' }}>
            选中 <strong style={{ color: 'var(--gold-bright)' }}>{aud ? aud.total : '…'}</strong> 人{audBusy && <span className={styles.small}>（正在算…）</span>}
            {excluded.length > 0 && <span className={styles.small}>（已手动去掉 {excluded.length} 人）</span>}
          </div>
          {aud && (
            <div className={styles.small} style={{ display: 'grid', gap: 2 }}>
              {CH.map((c) => <div key={c.key}>{c.label}能发到 <strong style={{ color: 'var(--ivory)' }}>{aud.reach[c.key].n}</strong> 人：{aud.reach[c.key].note}</div>)}
            </div>
          )}
        </div>

        {audiences.length > 0 && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="aud-pick">常用人群（一键套用，会替换现在的条件）</label>
            <select id="aud-pick" className={styles.select} value={pickAud} onChange={(e) => applyAud(e.target.value)}>
              <option value="">选一个常用人群…</option>
              {audiences.map((a) => <option key={a.id} value={a.id}>{a.name}（{a.created_by} 存）</option>)}
            </select>
          </div>
        )}

        {conds.map((c, i) => {
          const d = def(c.field);
          return (
            <div key={i} style={{ border: '1px solid var(--line-3)', borderRadius: 6, padding: 12, marginBottom: 10 }}>
              <div className={styles.inputRow} style={{ alignItems: 'center' }}>
                <span className={styles.small} style={{ flex: '0 0 auto' }}>{i === 0 ? '条件' : '并且'}</span>
                <select className={styles.select} style={{ flex: '1 1 200px' }} aria-label={`第 ${i + 1} 个条件选哪一项`} value={c.field} onChange={(e) => setCond(i, { field: e.target.value, values: [] })}>
                  <option value="">选一项…</option>
                  {catalog.filter((x) => x.key === c.field || !used.has(x.key)).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </select>
                <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setConds(conds.filter((_, j) => j !== i))}>删掉这个条件</button>
              </div>
              {d && (
                <>
                  <p className={styles.small} style={{ margin: '6px 0' }}>{d.multi ? '可多选（满足其一即可）' : '只能选一个'}{d.hint ? ` · ${d.hint}` : ''}{c.values.length ? ` · 已选 ${c.values.length} 个` : ' · 还没选，这一条暂时不起作用'}</p>
                  {d.options.length === 0 ? <p className={styles.small}>这一项现在还没有可选的值。</p> : (
                    <div className={styles.chips} style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {d.options.map((o) => (
                        <button key={o.value} className={`${styles.chip} ${c.values.includes(o.value) ? styles.chipOn : ''}`} aria-pressed={c.values.includes(o.value)} onClick={() => toggleValue(i, o.value)} style={{ minHeight: 44 }}>
                          {c.values.includes(o.value) ? '✓ ' : ''}{o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        <button className={`${styles.btn} ${styles.btnGhost}`} disabled={used.size >= catalog.length} onClick={() => setConds([...conds, { field: '', values: [] }])}>＋ 加一个条件</button>

        <div style={{ marginTop: '1rem' }}>
          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setShowList(!showList)} aria-expanded={showList}>{showList ? '收起名单' : `展开名单（${aud ? Math.min(aud.list.length, aud.total) : 0} 人${aud && aud.total > aud.list.length ? `，只列前 ${aud.list.length}` : ''}）`}</button>
          {showList && aud && (
            <ul className={styles.list} style={{ maxHeight: 420, overflowY: 'auto', marginTop: 8 }}>
              {aud.list.map((p) => (
                <li key={p.id} className={styles.listItem} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>{p.name ?? 'SAREC 用户'}{p.member_no ? <span className={styles.small}> · 会员号 {p.member_no}</span> : null}</div>
                    <div className={styles.small}>{p.region ?? '地区未知'} · {p.phone ? '有手机' : '没手机'} · {p.email ? '邮箱已验证' : '邮箱没验证'}</div>
                  </div>
                  <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => { setExcluded([...excluded, { id: p.id, name: p.name ?? 'SAREC 用户' }]); setMsg({ ok: true, text: `已从这次名单里去掉 ${p.name ?? 'SAREC 用户'}` }); }}>去掉</button>
                </li>
              ))}
            </ul>
          )}
          {excluded.length > 0 && (
            <p className={styles.small}>
              手动去掉的人：{excluded.map((x, i) => (
                <span key={x.id}>{i ? '、' : ''}{x.name}<button className={styles.copyBtn} style={{ marginLeft: 4, minWidth: 0 }} onClick={() => setExcluded(excluded.filter((y) => y.id !== x.id))}>加回来</button></span>
              ))}
            </p>
          )}
        </div>

        <div className={styles.inputRow} style={{ marginTop: '1rem' }}>
          <input className={styles.input} placeholder="给这组条件起个名字，例如：湾区会员" aria-label="常用人群名字" maxLength={30} value={audName} onChange={(e) => setAudName(e.target.value)} />
          <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!audName.trim()} onClick={saveAud}>存成常用人群</button>
        </div>
      </section>

      {/* 第二步 */}
      <section className={`${styles.card} ${styles.cardGold}`}>
        <p className={styles.cardTitle}>第二步 · 写内容</p>
        <p className={styles.small} style={{ marginTop: 0 }}>选渠道（可多选），每个渠道各写各的。</p>
        <div className={styles.chips} style={{ marginBottom: '1rem' }}>
          {CH.map((c) => {
            const on = channels.includes(c.key);
            return (
              <button key={c.key} className={`${styles.chip} ${on ? styles.chipOn : ''}`} aria-pressed={on} onClick={() => setChannels(on ? channels.filter((x) => x !== c.key) : [...channels, c.key])}>
                {on ? '✓ ' : ''}{c.label}{aud ? `（能发到 ${aud.reach[c.key].n} 人）` : ''}
              </button>
            );
          })}
        </div>
        {smsOn && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bc-sms">短信内容</label>
            <textarea id="bc-sms" className={styles.textarea} maxLength={300} value={sms} onChange={(e) => setSms(e.target.value)} placeholder="例如：【SAREC】本周六下午 2 点…" />
            <p className={styles.small} style={{ margin: 0 }}>
              {Array.from(sms).length} 字 · 每 70 字算一条，这条短信每人 {segs(sms)} 条（最多 300 字）。
            </p>
            <p className={styles.notice} style={{ margin: '0.4rem 0 0' }}>
              {est ? <>预计 <strong>{est.messages}</strong> 条（{est.people} 人 × {est.segments} 条），约 <strong>${est.usd.toFixed(2)}</strong>（美国号码约 $0.0083 / 条，中国号码约 $0.05 / 条）</> : '正在估算费用…'}
            </p>
          </div>
        )}
        {channels.includes('email') && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bc-subj">邮件标题</label>
              <input id="bc-subj" className={styles.input} maxLength={80} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bc-body">邮件正文</label>
              <textarea id="bc-body" className={styles.textarea} maxLength={5000} style={{ minHeight: 180 }} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
              <p className={styles.small} style={{ margin: 0 }}>只发给验证过邮箱、没退订的人；{Array.from(emailBody).length} / 5000 字。</p>
            </div>
          </>
        )}
        {channels.includes('wechat') && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bc-wx">微信服务通知（一句话，20 字以内）</label>
            <input id="bc-wx" className={styles.input} maxLength={20} value={wechat} onChange={(e) => setWechat(e.target.value)} placeholder="例如：本周六活动名额还有 10 个" />
            <p className={styles.small} style={{ margin: 0 }}>{Array.from(wechat).length} / 20 字。服务通知只能用已有模板，这句填在模板的“备注”里；只发给点过“允许通知”、还没用掉的人，每次允许只能发一条。</p>
          </div>
        )}
        {!channels.length && <p className={styles.small}>还没选渠道。</p>}
      </section>

      {/* 第三步 */}
      <section className={`${styles.card} ${styles.cardGold}`}>
        <p className={styles.cardTitle}>第三步 · 先预览，再确认</p>
        {missing.length > 0 && <p className={styles.small} style={{ marginTop: 0 }}>还差：{missing.join('；')}。</p>}
        <button className={styles.btn} disabled={missing.length > 0 || !!busy} onClick={preview}>{busy === 'preview' ? '处理中…' : previewed ? '再发一次预览' : '先发一条给东哥本人预览'}</button>
        {previewMsg && bid?.sig === sig && <p className={styles.notice} style={{ marginTop: '0.8rem' }}>{previewMsg}</p>}
        {bid && bid.sig !== sig && <p className={styles.small}>人或内容改过了，要重新预览。</p>}
        {previewed && (
          <div style={{ marginTop: '0.8rem' }}>
            <button className={`${styles.btn} ${admin ? '' : styles.btnQuiet}`} disabled={!admin || !!busy} onClick={confirm}>{busy === 'confirm' ? '处理中…' : '确认群发'}</button>
            <p className={styles.small} style={{ margin: '0.4rem 0 0' }}>
              {admin ? `将按上面的人和内容群发${dryRun ? '（演练：只记录本来会发给谁，不真的发）' : ''}。` : '只有管理员能确认群发。请把这页告诉东哥（或其他管理员），他登录后在「群发记录」里能看到这一条。'}
            </p>
          </div>
        )}
        {result && <p className={styles.success} style={{ whiteSpace: 'pre-line', marginTop: '0.8rem' }}>{result}</p>}
      </section>

      {/* 记录 */}
      <h2 className={styles.h}>群发记录（{records.length}）</h2>
      {records.length === 0 && <p className={styles.small}>还没有群发记录。</p>}
      {records.map((b) => {
        const res = b.counts?.result;
        return (
          <div key={b.id} className={styles.card}>
            <p className={styles.cardTitle} style={{ fontSize: '1.05rem' }}>
              {b.channels.map((c) => CH_NAME[c] ?? c).join(' + ')}
              <span className={`${styles.badge} ${b.status === 'sent' ? styles.badgeGreen : styles.badgeMuted}`}>{STATUS[b.status] ?? b.status}</span>
              {b.dry_run && <span className={`${styles.badge} ${styles.badgeMuted}`}>演练</span>}
            </p>
            <p className={styles.small} style={{ margin: 0 }}>
              {b.created_by} 于 {fmtDateTime(b.created_at)} 写的 · 选中 {b.counts?.total ?? '?'} 人
              {b.previewed_at ? ` · ${fmtDateTime(b.previewed_at)} 预览过` : ''}
              {b.confirmed_by ? ` · ${b.confirmed_by} 于 ${fmtDateTime(b.confirmed_at!)} 确认` : ''}
            </p>
            {(b.content.sms || b.content.emailSubject || b.content.wechat) && (
              <p className={styles.small} style={{ margin: '0.3rem 0' }}>
                {b.content.sms ? `短信：${b.content.sms.slice(0, 40)}${b.content.sms.length > 40 ? '…' : ''}　` : ''}
                {b.content.emailSubject ? `邮件：${b.content.emailSubject}　` : ''}
                {b.content.wechat ? `服务通知：${b.content.wechat}` : ''}
              </p>
            )}
            {res ? (
              <ul style={{ margin: '0.3rem 0', paddingLeft: '1.2em' }}>
                {Object.entries(res).map(([ch, x]) => <li key={ch}>{CH_NAME[ch] ?? ch}：本来会发给 <strong>{x.would}</strong> 人，发不到 {x.skipped} 人</li>)}
              </ul>
            ) : (
              <p className={styles.small} style={{ margin: '0.3rem 0' }}>还没确认。按写的时候算：{b.channels.map((c) => `${CH_NAME[c]}能发到 ${(b.counts as Record<string, unknown>)?.[c] ?? '?'} 人`).join('，')}</p>
            )}
            {b.status === 'sent' && (
              <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} aria-expanded={openRec === b.id} onClick={() => showRecips(b.id)}>{openRec === b.id ? '收起收件人' : '看收件人'}</button>
            )}
            {openRec === b.id && (
              recips === null ? <p className={styles.small}>正在加载…</p> : recips.length === 0 ? <p className={styles.small}>没有收件人记录。</p> : (
                <div className={styles.tableWrap} style={{ maxHeight: 360, overflowY: 'auto', marginTop: 8 }}>
                  <table className={styles.table}>
                    <thead><tr><th>渠道</th><th>姓名</th><th>会员号</th><th>结果</th></tr></thead>
                    <tbody>
                      {recips.map((r, i) => (
                        <tr key={i}><td>{CH_NAME[r.channel] ?? r.channel}</td><td>{r.name ?? 'SAREC 用户'}</td><td>{r.member_no ?? '—'}</td><td>{r.result === 'dry_run' ? '本来会发（演练没发）' : r.result === 'unreachable' ? '发不到' : r.result}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        );
      })}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="群发" wide>
      {(s) => <BroadcastDesk staff={s} />}
    </StaffGate>
  );
}
