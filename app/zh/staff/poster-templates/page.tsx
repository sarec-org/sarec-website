'use client';
/**
 * 1.7.0 海报模板（运营）：小程序「出海报」能选的模板底图。
 * - 按分类看缩略图（一次看一类，点图看大图）；每张：上移 / 下移、下架 / 恢复、换图、改名、改分类。
 * - 上传新模板：选分类、起名字、选图（服务器裁成 1080×1620 大图 + 300×450 小图）。
 * - 顶上「传自己的海报」开关（默认关）：要先在微信后台核清服务类目再开。
 * - 所有操作记操作记录（crm_audit_log）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { Lightbox, Toast, uploadForm } from '@/components/crm/staff/ugcShared';

type Cat = { key: string; name: string; tier: number; sort: number; active: boolean };
type Tpl = {
  id: string; code: string | null; category_key: string; name: string; status: 'active' | 'hidden'; source: string | null;
  version: number; uses: number; box: number[] | null; thumb: string; large: string;
};
type Data = { categories: Cat[]; templates: Tpl[]; uploadOn: boolean };
const TIER: Record<number, string> = { 1: '常用', 2: '较常用', 3: '其他' };

function PosterTemplates() {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);
  const [cat, setCat] = useState('');
  const [busy, setBusy] = useState('');
  const [big, setBig] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [up, setUp] = useState<{ category: string; name: string; file: File | null }>({ category: '', name: '', file: null });

  const load = useCallback(async () => {
    const r = await api<Data>('/api/v1/staff/poster-templates');
    if (r.ok) {
      setD(r.data);
      setCat((c) => c || r.data.categories[0]?.key || '');
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
    setBusy('upload');
    const fd = new FormData();
    fd.append('category', up.category);
    fd.append('name', up.name.trim());
    fd.append('file', up.file);
    const r = await uploadForm<{ message: string }>('/api/v1/staff/poster-templates/upload', fd);
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) {
      setCat(up.category);
      setUp({ category: up.category, name: '', file: null });
      load();
    }
  }

  if (!d) return <><Toast m={msg} onClose={closeMsg} /><p className={styles.muted}>正在加载…</p></>;
  const list = d.templates.filter((t) => t.category_key === cat);
  const curCat = d.categories.find((c) => c.key === cat);

  return (
    <>
      <p className={styles.lead}>主办方在小程序里发活动、出海报时可以选一张模板底图，服务器把活动名称、时间、地点、主办方和报名码印上去。一共 {d.templates.filter((t) => t.status === 'active').length} 张在用（{d.templates.length} 张里），{d.categories.length} 个分类。改动 1 分钟内小程序就能看到。</p>
      <Toast m={msg} onClose={closeMsg} />
      <Lightbox url={big} onClose={() => setBig(null)} />

      <div className={`${styles.card} ${styles.cardGold}`}>
        <p className={styles.cardTitle}>传自己的海报：{d.uploadOn ? '开着' : '关着'}</p>
        <p className={styles.small} style={{ margin: '0 0 8px' }}>打开后，主办方出海报时可以用自己手机里的图当底图。要先在微信后台核清服务类目再开。</p>
        <div className={styles.btnRow}>
          {d.uploadOn
            ? <button className={`${styles.btn} ${styles.btnDanger}`} disabled={!!busy} onClick={() => post({ action: 'set_upload_on', on: false }, 'sw')}>关掉「传自己的海报」</button>
            : <button className={styles.btn} disabled={!!busy} onClick={() => post({ action: 'set_upload_on', on: true }, 'sw')}>打开「传自己的海报」</button>}
        </div>
      </div>

      <h2 className={styles.h}>分类（点一个看这一类的模板）</h2>
      <div className={styles.chips}>
        {d.categories.map((c) => (
          <button key={c.key} className={`${styles.chip} ${c.key === cat ? styles.chipOn : ''}`} onClick={() => { setCat(c.key); setRenaming(null); }}>
            {c.name} {count[c.key]?.on ?? 0}{(count[c.key]?.all ?? 0) > (count[c.key]?.on ?? 0) ? `（下架 ${(count[c.key]?.all ?? 0) - (count[c.key]?.on ?? 0)}）` : ''}
          </button>
        ))}
      </div>

      {curCat && (
        <>
          <h2 className={styles.h}>{curCat.name}（{TIER[curCat.tier] ?? `第 ${curCat.tier} 档`}，{list.length} 张，按小程序里的顺序）</h2>
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
                  {t.box ? '有信息位' : '老图（默认底部）'} · 用过 {t.uses} 次{t.version > 1 ? ` · 第 ${t.version} 版` : ''}
                </p>
                {renaming?.id === t.id ? (
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
                    <label className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} style={{ cursor: 'pointer' }}>
                      {busy === 'r' + t.id ? '正在换…' : '换图'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) replace(t.id, f); }} />
                    </label>
                    <select className={styles.select} style={{ width: '100%', margin: 0 }} aria-label="改分类" value="" disabled={!!busy} onChange={(e) => e.target.value && post({ action: 'set_category', id: t.id, category: e.target.value }, 'c' + t.id)}>
                      <option value="">改分类…</option>
                      {d.categories.filter((c) => c.key !== t.category_key).map((c) => <option key={c.key} value={c.key}>挪到「{c.name}」</option>)}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className={styles.h}>上传新模板</h2>
      <div className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pt-cat">分类<span className={styles.required}>*</span></label>
          <select id="pt-cat" className={styles.select} value={up.category} onChange={(e) => setUp({ ...up, category: e.target.value })}>
            <option value="">请选择</option>
            {d.categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
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
        <p className={styles.small}>后台上传的模板按“老图”出海报：字印在画面下部，垫一块半透明深色底板。</p>
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
