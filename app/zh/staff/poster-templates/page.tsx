'use client';
/**
 * 1.7.0 海报模板（运营）：小程序「出海报」能选的模板底图。
 * - 按分类看缩略图（一次看一类，点图看大图）；每张：上移 / 下移、下架 / 恢复、换图、改名、改分类。
 * - 上传新模板：选分类、起名字、选图（服务器裁成 1080×1620 大图 + 300×450 小图）。
 * - 顶上「传自己的海报」开关（默认关）：要先在微信后台核清服务类目再开。
 * - 0054 节日祝福：顶上分「办活动」「节日祝福」两组（祝福图也在这一页管）。节日日期在「节日日期表」（/zh/staff/festivals）统一管（指令 83），
 *   祝福模板能设落款位（左、上、右、下四个 0–1 的数；不设 = 默认底部一条并垫底板）。上传、改分类时选用途（模板的用途跟着分类）。
 * - 所有操作记操作记录（crm_audit_log）。
 */
import { useHashScroll } from '@/components/crm/staff/useHashScroll';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { Lightbox, Toast, uploadForm } from '@/components/crm/staff/ugcShared';

type Purpose = 'event' | 'greeting';
type Cat = { key: string; name: string; tier: number; sort: number; active: boolean; purpose: Purpose; festival_date: string | null };
type Tpl = {
  id: string; code: string | null; category_key: string; name: string; status: 'active' | 'hidden'; source: string | null;
  version: number; uses: number; box: number[] | null; thumb: string; large: string; purpose: Purpose; sig_box: number[] | null; badge_pos?: string | null;
};
type Badge = { on: boolean; textH: number; opacity: number; style: string; pos: string };
const BADGE_STYLE: Record<string, string> = { seal: '细金边小章', plaque: '圆角小牌', strip: '贴条子（落款条 / 信息栏右端）' };
const BADGE_POS: Record<string, string> = { tr: '右上角', tl: '左上角', br: '右下角', bl: '左下角', strip: '条子右端' };
type Data = { categories: Cat[]; templates: Tpl[]; uploadOn: boolean; aiBadge?: Badge };
const TIER: Record<number, string> = { 1: '常用', 2: '较常用', 3: '其他' };
const PURPOSE: Record<Purpose, string> = { event: '办活动', greeting: '节日祝福' };
const SIG_LABELS = ['左', '上', '右', '下'];
/** 四个输入框 → 数组；全空 = 不设（null）；有不是数字的 → 'bad' */
function sigFrom(v: string[]): number[] | null | 'bad' {
  if (v.every((x) => !x.trim())) return null;
  const n = v.map((x) => Number(x));
  return n.some((x) => !Number.isFinite(x) || x < 0 || x > 1) || v.some((x) => !x.trim()) ? 'bad' : n;
}
function SigInputs({ v, onChange, id }: { v: string[]; onChange: (v: string[]) => void; id: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
      {SIG_LABELS.map((l, i) => (
        <label key={l} className={styles.small} style={{ display: 'flex', flexDirection: 'column', gap: 2 }} htmlFor={`${id}-${i}`}>
          {l}
          <input id={`${id}-${i}`} className={styles.input} style={{ margin: 0, minWidth: 0 }} inputMode="decimal" placeholder={['0.06', '0.84', '0.94', '0.95'][i]}
            value={v[i]} onChange={(e) => onChange(v.map((x, j) => (j === i ? e.target.value : x)))} />
        </label>
      ))}
    </div>
  );
}

function PosterTemplates() {
  const [d, setD] = useState<Data | null>(null);
  useHashScroll(!!d); // 指令 89-B：从「开关」/ 搜索带 #某块 点进来时滚到那一块
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);
  const [cat, setCat] = useState('');
  const [busy, setBusy] = useState('');
  const [big, setBig] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [up, setUp] = useState<{ purpose: Purpose; category: string; name: string; file: File | null; sig: string[] }>({ purpose: 'event', category: '', name: '', file: null, sig: ['', '', '', ''] });
  const [purpose, setPurpose] = useState<Purpose>('event');
  const [sigEdit, setSigEdit] = useState<{ id: string; v: string[] } | null>(null);
  const [dateEdit, setDateEdit] = useState<{ key: string; v: string } | null>(null);
  const [badge, setBadge] = useState<{ on: boolean; textH: string; opacity: string; style: string; pos: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api<Data>('/api/v1/staff/poster-templates');
    if (r.ok) {
      setD(r.data);
      // 指令 89-B 验收 P3-6：搜「祝福」带 ?purpose=greeting 进来时直接打开「节日祝福图」
      const want: Purpose = new URLSearchParams(location.search).get('purpose') === 'greeting' ? 'greeting' : 'event';
      setCat((c) => {
        if (c) return c;
        if (want === 'greeting') setPurpose('greeting');
        return r.data.categories.find((x) => x.purpose === want)?.key || r.data.categories[0]?.key || '';
      });
    } else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);

  const count = useMemo(() => {
    const m: Record<string, { all: number; on: number }> = {};
    for (const t of d?.templates ?? []) {
      const x = (m[t.category_key] ??= { all: 0, on: 0 });
      x.all++;
      if (t.status === 'active') x.on++;
    }
    return m;
  }, [d]);

  async function post(body: Record<string, unknown>, tag: string): Promise<boolean> {
    setBusy(tag);
    const r = await api<{ message: string }>('/api/v1/staff/poster-templates', { body });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) load();
    return r.ok;
  }
  async function replace(id: string, file: File) {
    setBusy('r' + id);
    const fd = new FormData();
    fd.append('id', id);
    fd.append('file', file);
    const r = await uploadForm<{ message: string }>('/api/v1/staff/poster-templates/replace', fd);
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) load();
  }
  async function upload() {
    if (!up.category || !up.name.trim() || !up.file) return setMsg({ ok: false, text: '请选分类、填名字、选图片' });
    const sig = up.purpose === 'greeting' ? sigFrom(up.sig) : null;
    if (sig === 'bad') return setMsg({ ok: false, text: '落款位要填 4 个 0–1 之间的数（左、上、右、下），或者全空着用默认' });
    setBusy('upload');
    const fd = new FormData();
    fd.append('category', up.category);
    fd.append('name', up.name.trim());
    fd.append('file', up.file);
    if (sig) fd.append('sig_box', JSON.stringify(sig));
    const r = await uploadForm<{ message: string }>('/api/v1/staff/poster-templates/upload', fd);
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) {
      setPurpose(up.purpose);
      setCat(up.category);
      setUp({ ...up, name: '', file: null, sig: ['', '', '', ''] });
      load();
    }
  }

  if (!d) return <><Toast m={msg} onClose={closeMsg} /><p className={styles.muted}>正在加载…</p></>;
  const list = d.templates.filter((t) => t.category_key === cat);
  const curCat = d.categories.find((c) => c.key === cat);
  const cats = d.categories.filter((c) => c.purpose === purpose);
  const pickPurpose = (p: Purpose) => { setPurpose(p); setCat(d.categories.find((c) => c.purpose === p)?.key ?? ''); setRenaming(null); setSigEdit(null); setDateEdit(null); };

  return (
    <>
      <p className={styles.lead}>主办方在小程序里发活动、出海报时可以选一张模板底图，服务器把活动名称、时间、地点、主办方和报名码印上去。一共 {d.templates.filter((t) => t.status === 'active').length} 张在用（{d.templates.length} 张里），{d.categories.length} 个分类。改动 1 分钟内小程序就能看到。</p>
      <Toast m={msg} onClose={closeMsg} />
      <Lightbox url={big} onClose={() => setBig(null)} />
      {/* 指令 89-B.4：要干的事放第一屏——上传新模板原来只在页面最底下 */}
      <div className={styles.btnRow} style={{ marginBottom: '0.8rem' }}>
        <a href="#upload" className={styles.btn}>＋ 上传新模板</a>
        <a href="#list" className={`${styles.btn} ${styles.btnGhost}`}>换 / 下架模板（按分类看）</a>
      </div>

      <div id="upload-own" className={`${styles.card} ${styles.cardGold}`} style={{ scrollMarginTop: 140 }}>
        <p className={styles.cardTitle}>传自己的海报：{d.uploadOn ? '开着' : '关着'}</p>
        <p className={styles.small} style={{ margin: '0 0 8px' }}>打开后，主办方出海报时可以用自己手机里的图当底图。要先在微信后台核清服务类目再开。</p>
        <div className={styles.btnRow}>
          {d.uploadOn
            ? <button className={`${styles.btn} ${styles.btnDanger}`} disabled={!!busy} onClick={() => post({ action: 'set_upload_on', on: false }, 'sw')}>关掉「传自己的海报」</button>
            : <button className={styles.btn} disabled={!!busy} onClick={() => post({ action: 'set_upload_on', on: true }, 'sw')}>打开「传自己的海报」</button>}
        </div>
      </div>

      {d.aiBadge && (() => {
        const b = badge ?? { on: d.aiBadge.on, textH: String(+(d.aiBadge.textH * 100).toFixed(1)), opacity: String(d.aiBadge.opacity), style: d.aiBadge.style, pos: d.aiBadge.pos };
        return (
          <div id="ai-badge" className={styles.card} style={{ scrollMarginTop: 140 }}>
            <p className={styles.cardTitle}>「AI 生成」标识：{d.aiBadge.on ? `开着（${BADGE_STYLE[d.aiBadge.style] ?? d.aiBadge.style}、${d.aiBadge.style === 'strip' ? '贴条子' : BADGE_POS[d.aiBadge.pos]}、字高 ${+(d.aiBadge.textH * 100).toFixed(1)}%）` : '关着（国家标准要求保留）'}</p>
            <p className={styles.small} style={{ margin: '0 0 8px' }}>活动海报和祝福图成品右上角的标识（服务器出图时画，改了马上生效，不用发版）。字和底色按右上角底图深浅自动选。国家标准 GB 45438-2025 要求：标识文字高度不低于画面最短边的 5%、在边或角、清晰可辨，所以字高最小 5%，不能调低。每张模板还能在下面单独选位置（压到标题时换个角）。</p>
            <div className={styles.btnRow}>
              <label className={styles.small} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" checked={b.on} onChange={(e) => setBadge({ ...b, on: e.target.checked })} />画标识</label>
              <select aria-label="样式" className={styles.select} style={{ width: 'auto', margin: 0 }} value={b.style} onChange={(e) => setBadge({ ...b, style: e.target.value })}>
                {Object.entries(BADGE_STYLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select aria-label="位置" className={styles.select} style={{ width: 'auto', margin: 0 }} value={b.pos} disabled={b.style === 'strip'} onChange={(e) => setBadge({ ...b, pos: e.target.value })}>
                {['tr', 'tl', 'br', 'bl'].map((k) => <option key={k} value={k}>{BADGE_POS[k]}</option>)}
              </select>
              <label className={styles.small} htmlFor="ab-h">字高（画面最短边的 %，5–8）</label>
              <input id="ab-h" type="number" min={5} max={8} step={0.5} className={styles.input} style={{ maxWidth: 80, margin: 0 }} value={b.textH} onChange={(e) => setBadge({ ...b, textH: e.target.value })} />
              <label className={styles.small} htmlFor="ab-op">底板深浅（0.2–1）</label>
              <input id="ab-op" className={styles.input} style={{ maxWidth: 70, margin: 0 }} inputMode="decimal" value={b.opacity} onChange={(e) => setBadge({ ...b, opacity: e.target.value })} />
              <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy || !badge} onClick={async () => {
                const th = Number(b.textH);
                if (!(th >= 5 && th <= 8)) return setMsg({ ok: false, text: '字高要在 5–8 之间（国家标准要求不低于画面最短边的 5%）' });
                if (!b.on && !window.confirm('国家标准要求保留「AI 生成」标识，关掉需商会确认法律风险。确定关掉？关了以后成品图上都不再有这个标识。')) return;
                if (await post({ action: 'set_ai_badge', on: b.on, textH: th / 100, opacity: Number(b.opacity), style: b.style, pos: b.pos }, 'ab')) setBadge(null);
              }}>保存</button>
            </div>
          </div>
        );
      })()}

      <h2 className={styles.h} id="list" style={{ scrollMarginTop: 140 }}>用途</h2>
      <div className={styles.chips}>
        {(['event', 'greeting'] as Purpose[]).map((p) => (
          <button key={p} className={`${styles.chip} ${p === purpose ? styles.chipOn : ''}`} onClick={() => pickPurpose(p)}>
            {p === 'event' ? '办活动的海报模板' : '节日祝福图'}（{d.templates.filter((t) => t.purpose === p && t.status === 'active').length} 张在用）
          </button>
        ))}
      </div>
      {purpose === 'greeting' && (
        <p className={styles.small}>小程序「发节日祝福」里用的图：用户挑一张，服务器自动印上他名片里的姓名 / 公司 / 头像。节日按日期排，离今天最近的排最前；日期在「节日日期表」里统一管。</p>
      )}

      <h2 className={styles.h}>分类（点一个看这一类的模板）</h2>
      <div className={styles.chips}>
        {cats.map((c) => (
          <button key={c.key} className={`${styles.chip} ${c.key === cat ? styles.chipOn : ''}`} onClick={() => { setCat(c.key); setRenaming(null); setSigEdit(null); setDateEdit(null); }}>
            {c.name} {count[c.key]?.on ?? 0}{(count[c.key]?.all ?? 0) > (count[c.key]?.on ?? 0) ? `（下架 ${(count[c.key]?.all ?? 0) - (count[c.key]?.on ?? 0)}）` : ''}
          </button>
        ))}
      </div>

      {curCat && curCat.purpose === purpose && (
        <>
          <h2 className={styles.h}>{curCat.name}（{curCat.purpose === 'greeting' ? '节日祝福' : TIER[curCat.tier] ?? `第 ${curCat.tier} 档`}，{list.length} 张，按小程序里的顺序）</h2>
          {curCat.purpose === 'greeting' && (
            <p className={styles.small}>节日日期、提前几天出现、显示到哪天，统一在 <a href="/zh/staff/festivals">节日日期表</a> 里改（已排到 2031 年，不用每年手改）。{curCat.festival_date ? `这里显示的 ${curCat.festival_date} 是旧的手填日期，只在这个分类没挂到节日表上时才用。` : ''}</p>
          )}
          {!list.length && <p className={styles.muted}>这一类还没有模板，可以在下面上传。</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {list.map((t, i) => (
              <div key={t.id} className={styles.card} style={{ margin: 0, padding: 10, opacity: t.status === 'hidden' ? 0.6 : 1, minWidth: 0 }}>
                <button onClick={() => setBig(t.large)} style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'zoom-in' }} aria-label={`看「${t.name}」大图`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.thumb} alt={t.name} loading="lazy" style={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 6, display: 'block', background: '#222' }} />
                </button>
                <p style={{ margin: '6px 0 2px', fontWeight: 600, overflowWrap: 'anywhere' }}>
                  {i + 1}. {t.name}
                  {t.status === 'hidden' && <span className={`${styles.badge} ${styles.badgeMuted}`}>已下架</span>}
                </p>
                <p className={styles.small} style={{ margin: '0 0 6px' }}>
                  {t.purpose === 'greeting'
                    ? (t.sig_box ? `落款位 ${t.sig_box.join(', ')}` : '落款位：默认底部（垫底板）')
                    : `${t.box ? '有信息位' : '老图（默认底部）'} · 用过 ${t.uses} 次`}{t.version > 1 ? ` · 第 ${t.version} 版` : ''}
                </p>
                {sigEdit?.id === t.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SigInputs id={'sig' + t.id} v={sigEdit.v} onChange={(v) => setSigEdit({ id: t.id, v })} />
                    <p className={styles.small} style={{ margin: 0 }}>按整张图的比例填（0 = 最左 / 最上，1 = 最右 / 最下）。全空着保存 = 用默认底部。</p>
                    <div className={styles.btnRow}>
                      <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy} onClick={async () => {
                        const v = sigFrom(sigEdit.v);
                        if (v === 'bad') return setMsg({ ok: false, text: '落款位要填 4 个 0–1 之间的数，或者全空着用默认' });
                        if (await post({ action: 'set_sig_box', id: t.id, sigBox: v }, 's' + t.id)) setSigEdit(null);
                      }}>保存落款位</button>
                      <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setSigEdit(null)}>取消</button>
                    </div>
                  </div>
                ) : renaming?.id === t.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input className={styles.input} value={renaming.name} maxLength={30} aria-label="新名字" onChange={(e) => setRenaming({ id: t.id, name: e.target.value })} />
                    <div className={styles.btnRow}>
                      <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy} onClick={async () => { if (await post({ action: 'rename', id: t.id, name: renaming.name }, 'n' + t.id)) setRenaming(null); }}>保存名字</button>
                      <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setRenaming(null)}>取消</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy || i === 0} onClick={() => post({ action: 'up', id: t.id }, 'm' + t.id)}>上移</button>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy || i === list.length - 1} onClick={() => post({ action: 'down', id: t.id }, 'm' + t.id)}>下移</button>
                    {t.status === 'active'
                      ? <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'hide', id: t.id }, 'h' + t.id)}>下架</button>
                      : <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'show', id: t.id }, 'h' + t.id)}>恢复</button>}
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => setRenaming({ id: t.id, name: t.name })}>改名</button>
                    {t.purpose === 'greeting' && (
                      <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => { setRenaming(null); setSigEdit({ id: t.id, v: t.sig_box ? t.sig_box.map(String) : ['', '', '', ''] }); }}>落款位</button>
                    )}
                    <label className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} style={{ cursor: 'pointer' }}>
                      {busy === 'r' + t.id ? '正在换…' : '换图'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) replace(t.id, f); }} />
                    </label>
                    <select className={styles.select} style={{ width: '100%', margin: 0 }} aria-label="AI 标识位置" value={t.badge_pos ?? ''} disabled={!!busy}
                      onChange={(e) => post({ action: 'set_badge_pos', id: t.id, pos: e.target.value || null }, 'bp' + t.id)}>
                      <option value="">AI 标识位置：跟全局</option>
                      {Object.entries(BADGE_POS).map(([k, v]) => <option key={k} value={k}>AI 标识：{v}</option>)}
                    </select>
                    <select className={styles.select} style={{ width: '100%', margin: 0 }} aria-label="改分类" value="" disabled={!!busy} onChange={(e) => e.target.value && post({ action: 'set_category', id: t.id, category: e.target.value }, 'c' + t.id)}>
                      <option value="">改分类 / 用途…</option>
                      {(['event', 'greeting'] as Purpose[]).map((p) => (
                        <optgroup key={p} label={PURPOSE[p]}>
                          {d.categories.filter((c) => c.purpose === p && c.key !== t.category_key).map((c) => <option key={c.key} value={c.key}>挪到「{c.name}」（{PURPOSE[p]}）</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className={styles.h} id="upload" style={{ scrollMarginTop: 140 }}>上传新模板</h2>
      <div className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pt-purpose">用途<span className={styles.required}>*</span></label>
          <select id="pt-purpose" className={styles.select} value={up.purpose} onChange={(e) => setUp({ ...up, purpose: e.target.value as Purpose, category: '' })}>
            <option value="event">办活动（出活动海报的底图）</option>
            <option value="greeting">节日祝福（发祝福图）</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pt-cat">分类<span className={styles.required}>*</span></label>
          <select id="pt-cat" className={styles.select} value={up.category} onChange={(e) => setUp({ ...up, category: e.target.value })}>
            <option value="">请选择</option>
            {d.categories.filter((c) => c.purpose === up.purpose).map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pt-name">名字<span className={styles.required}>*</span>（30 字以内，小程序里显示）</label>
          <input id="pt-name" className={styles.input} value={up.name} maxLength={30} placeholder="例如 雪夜暖光" onChange={(e) => setUp({ ...up, name: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pt-file">图片<span className={styles.required}>*</span>（竖图，最好 1024×1536 或更大；会居中裁成 2:3。下面要留出印字和报名码的地方）</label>
          <input id="pt-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setUp({ ...up, file: e.target.files?.[0] ?? null })} />
        </div>
        {up.purpose === 'greeting' ? (
          <div className={styles.field}>
            <span className={styles.label}>落款位（选填：图上留给姓名 / 公司的那一块，按整张图的比例填；全空着 = 默认底部一条并垫底板）</span>
            <SigInputs id="pt-sig" v={up.sig} onChange={(sig) => setUp({ ...up, sig })} />
          </div>
        ) : (
          <p className={styles.small}>后台上传的模板按“老图”出海报：字印在画面下部，垫一块半透明深色底板。</p>
        )}
        <button className={styles.btn} disabled={!!busy} onClick={upload}>{busy === 'upload' ? '正在上传…' : '上传'}</button>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <StaffGate title="海报模板" role="ops" wide>
      {() => <PosterTemplates />}
    </StaffGate>
  );
}
