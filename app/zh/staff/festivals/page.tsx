'use client';
/**
 * 指令 83 节日日期表（运营）：小程序「挑海报」按日期智能排序用。
 * - 每个节日：提前几天出祝福、节后再显示几天（春节 6 = 到初七）、对应的办活动分类 / 祝福分类、启用。
 * - 每年的日期：能加能删（农历节日每年不同；表里已算到 2031 年）。
 * - 能加新节日。所有操作记操作记录（crm_audit_log）。改动 1 分钟内小程序能看到。
 */
import { useHashScroll } from '@/components/crm/staff/useHashScroll';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { Toast } from '@/components/crm/staff/ugcShared';

type Kind = 'cn' | 'us' | 'intl';
type Fest = {
  key: string; name: string; kind: Kind; show_before_days: number; show_until_offset: number; home_before_days: number;
  category_key: string | null; greet_category_key: string | null; sort: number; active: boolean;
  next: string | null; inWindow: boolean; dates: string[];
};
type Cat = { key: string; name: string; purpose: 'event' | 'greeting' };
type Data = { today: string; datesUntil: string | null; datesLeftDays: number | null; festivals: Fest[]; categories: Cat[] };
type Form = { key: string; name: string; kind: Kind; before: string; until: string; home: string; cat: string; greet: string; sort: string; active: boolean };
const KIND: Record<Kind, string> = { cn: '中国', us: '美国', intl: '国际' };
const toForm = (f: Fest): Form => ({
  key: f.key, name: f.name, kind: f.kind, before: String(f.show_before_days), until: String(f.show_until_offset), home: String(f.home_before_days),
  cat: f.category_key ?? '', greet: f.greet_category_key ?? '', sort: String(f.sort), active: f.active
});
const EMPTY: Form = { key: '', name: '', kind: 'cn', before: '2', until: '0', home: '14', cat: '', greet: '', sort: '', active: true };

function FestForm({ v, set, cats, isNew }: { v: Form; set: (v: Form) => void; cats: Cat[]; isNew: boolean }) {
  const id = isNew ? 'nf' : 'ef-' + v.key;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
      {isNew && (
        // 指令 89-B 验收 P3-3：编号可以不填，保存时自动生成（东哥填不了"小写英文"）
        <label className={styles.small} htmlFor={id + '-key'}>编号（可不填，自动生成）
          <input id={id + '-key'} className={styles.input} style={{ margin: 0 }} value={v.key} placeholder="不填就自动生成" onChange={(e) => set({ ...v, key: e.target.value })} />
        </label>
      )}
      <label className={styles.small} htmlFor={id + '-name'}>名字（例如 中秋节）
        <input id={id + '-name'} className={styles.input} style={{ margin: 0 }} value={v.name} maxLength={20} placeholder="例如 中秋节" onChange={(e) => set({ ...v, name: e.target.value })} />
      </label>
      <label className={styles.small} htmlFor={id + '-kind'}>类别
        <select id={id + '-kind'} className={styles.select} style={{ margin: 0 }} value={v.kind} onChange={(e) => set({ ...v, kind: e.target.value as Kind })}>
          {(Object.keys(KIND) as Kind[]).map((k) => <option key={k} value={k}>{KIND[k]}</option>)}
        </select>
      </label>
      <label className={styles.small} htmlFor={id + '-before'}>提前几天出祝福
        <input id={id + '-before'} className={styles.input} style={{ margin: 0 }} inputMode="numeric" value={v.before} onChange={(e) => set({ ...v, before: e.target.value })} />
      </label>
      <label className={styles.small} htmlFor={id + '-until'}>节后再显示几天（0 = 当天撤）
        <input id={id + '-until'} className={styles.input} style={{ margin: 0 }} inputMode="numeric" value={v.until} onChange={(e) => set({ ...v, until: e.target.value })} />
      </label>
      <label className={styles.small} htmlFor={id + '-home'}>首页「节日祝福」提前几天出现
        <input id={id + '-home'} className={styles.input} style={{ margin: 0 }} inputMode="numeric" value={v.home} onChange={(e) => set({ ...v, home: e.target.value })} />
      </label>
      <label className={styles.small} htmlFor={id + '-cat'}>办活动分类（「快到的节日」）
        <select id={id + '-cat'} className={styles.select} style={{ margin: 0 }} value={v.cat} onChange={(e) => set({ ...v, cat: e.target.value })}>
          <option value="">（没有）</option>
          {cats.filter((c) => c.purpose === 'event').map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
      </label>
      <label className={styles.small} htmlFor={id + '-greet'}>祝福分类（最上面的祝福）
        <select id={id + '-greet'} className={styles.select} style={{ margin: 0 }} value={v.greet} onChange={(e) => set({ ...v, greet: e.target.value })}>
          <option value="">（没有）</option>
          {cats.filter((c) => c.purpose === 'greeting').map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
      </label>
      <label className={styles.small} htmlFor={id + '-sort'}>排序（后台显示用）
        <input id={id + '-sort'} className={styles.input} style={{ margin: 0 }} inputMode="numeric" value={v.sort} onChange={(e) => set({ ...v, sort: e.target.value })} />
      </label>
      <label className={styles.small} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={v.active} onChange={(e) => set({ ...v, active: e.target.checked })} /> 启用
      </label>
    </div>
  );
}

function Festivals() {
  const [d, setD] = useState<Data | null>(null);
  useHashScroll(!!d); // 指令 89-B：从「开关」/ 搜索带 #某块 点进来时滚到那一块
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);
  const [busy, setBusy] = useState('');
  const [edit, setEdit] = useState<Form | null>(null);
  const [open, setOpen] = useState('');
  const [newDate, setNewDate] = useState('');
  const [nf, setNf] = useState<Form>(EMPTY);

  const load = useCallback(async () => {
    const r = await api<Data>('/api/v1/staff/festivals');
    if (r.ok) setD(r.data);
    else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: Record<string, unknown>, tag: string): Promise<boolean> {
    setBusy(tag);
    const r = await api<{ message: string }>('/api/v1/staff/festivals', { body });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) load();
    return r.ok;
  }
  const save = (f: Form, create: boolean) => post({
    action: 'save', create, key: f.key.trim() || (create ? `fest_${Date.now().toString(36)}` : ''), name: f.name, kind: f.kind, showBeforeDays: Number(f.before), showUntilOffset: Number(f.until), homeBeforeDays: Number(f.home),
    categoryKey: f.cat || null, greetCategoryKey: f.greet || null, sort: f.sort === '' ? null : Number(f.sort), active: f.active
  }, 'save' + f.key);

  if (!d) return <><Toast m={msg} onClose={closeMsg} /><p className={styles.muted}>正在加载…</p></>;
  const catName = (k: string | null) => (k ? d.categories.find((c) => c.key === k)?.name ?? k : '—');
  const upcoming = [...d.festivals].filter((f) => f.active && f.next).sort((a, b) => (a.next! < b.next! ? -1 : a.next! > b.next! ? 1 : 0));

  return (
    <>
      <p className={styles.lead}>小程序「挑海报」从上到下：① 在祝福窗口里的节日祝福（节日前 N 天出现，到节后第 M 天撤）；② 快到的节日（节日类活动分类，离今天近的在前）；③ 常用活动（按使用次数）。今天（洛杉矶）是 {d.today}。改动 1 分钟内小程序能看到。</p>
      <Toast m={msg} onClose={closeMsg} />
      {/* 指令 89-B.4：「加一个节日」原来只在页面最底下（22 个节日之后），第一屏给直达 */}
      <div className={styles.btnRow} style={{ marginBottom: '0.8rem' }}>
        <a href="#add" className={styles.btn}>＋ 加一个节日</a>
      </div>
      {(d.datesLeftDays == null || d.datesLeftDays < 365) && (
        <div className={`${styles.card} ${styles.cardGold}`}>
          <p className={styles.cardTitle}>日期表还剩不到 1 年{d.datesUntil ? `（有节日只排到 ${d.datesUntil}）` : '（有节日一个以后的日期都没有）'}</p>
          <p className={styles.small} style={{ margin: 0 }}>请在下面给各节日加明后年的日期（农历节日每年不同），或者让开发用 db/sql/festival_dates_gen.mjs 再算一段。日期用完的节日会掉进「常用活动」。</p>
        </div>
      )}

      <h2 className={styles.h}>接下来的节日</h2>
      <p className={styles.small}>
        {upcoming.slice(0, 8).map((f) => `${f.name} ${f.next}${f.inWindow ? '（祝福显示中）' : ''}`).join(' → ') || '表里没有以后的日期'}
      </p>

      <h2 className={styles.h}>全部节日（{d.festivals.length} 个）</h2>
      {d.festivals.map((f) => {
        const last = f.dates[f.dates.length - 1];
        return (
          <div key={f.key} className={styles.card} style={{ opacity: f.active ? 1 : 0.6 }}>
            <p className={styles.cardTitle} style={{ overflowWrap: 'anywhere' }}>
              {f.name}<span className={`${styles.badge} ${styles.badgeMuted}`}>{KIND[f.kind]}</span>
              {f.inWindow && <span className={styles.badge}>祝福显示中</span>}
              {!f.active && <span className={`${styles.badge} ${styles.badgeMuted}`}>停用</span>}
            </p>
            <p className={styles.small} style={{ margin: '0 0 6px', overflowWrap: 'anywhere' }}>
              下一次 {f.next ?? '（表里没有以后的日期，请加）'} · 提前 {f.show_before_days} 天出祝福 · 首页提前 {f.home_before_days} 天 · {f.show_until_offset ? `节后再显示 ${f.show_until_offset} 天` : '当天过完撤'} ·
              活动分类：{catName(f.category_key)} · 祝福分类：{catName(f.greet_category_key)} · 日期排到 {last ?? '—'}
            </p>
            {edit?.key === f.key ? (
              <>
                <FestForm v={edit} set={setEdit} cats={d.categories} isNew={false} />
                <div className={styles.btnRow} style={{ marginTop: 8 }}>
                  <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy} onClick={async () => { if (await save(edit, false)) setEdit(null); }}>保存</button>
                  <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setEdit(null)}>取消</button>
                </div>
              </>
            ) : (
              <div className={styles.btnRow}>
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => setEdit(toForm(f))}>改设置</button>
                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => { setOpen(open === f.key ? '' : f.key); setNewDate(''); }}>
                  {open === f.key ? '收起日期' : `看 / 改日期（${f.dates.length}）`}
                </button>
              </div>
            )}
            {open === f.key && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {f.dates.map((x) => (
                    <span key={x} className={styles.chip} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {x}
                      <button aria-label={`删掉 ${x}`} disabled={!!busy} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: '0 2px' }}
                        onClick={() => { if (window.confirm(`删掉「${f.name}」的 ${x}？`)) post({ action: 'del_date', key: f.key, date: x }, 'dd' + f.key); }}>×</button>
                    </span>
                  ))}
                </div>
                <div className={styles.btnRow} style={{ marginTop: 6 }}>
                  <input type="date" aria-label="加一个日期" className={styles.input} style={{ maxWidth: 200, margin: 0 }} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy || !newDate} onClick={async () => { if (await post({ action: 'add_date', key: f.key, date: newDate }, 'ad' + f.key)) setNewDate(''); }}>加日期</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <h2 className={styles.h} id="add" style={{ scrollMarginTop: 140 }}>加一个节日</h2>
      <div className={styles.card}>
        <FestForm v={nf} set={setNf} cats={d.categories} isNew />
        <p className={styles.small}>加好后在它下面「看 / 改日期」里把每年的日期加上。</p>
        <button className={styles.btn} disabled={!!busy} onClick={async () => { if (await save(nf, true)) setNf(EMPTY); }}>加节日</button>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <StaffGate title="节日日期表" role="ops" wide>
      {() => <Festivals />}
    </StaffGate>
  );
}
