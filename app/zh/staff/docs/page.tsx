'use client';
/**
 * 1.3.3 商会资料（公司 PPT 介绍等）：小程序里一页一屏看、能转发、能查看 / 转发 PDF 原件。
 * PPT 在 PowerPoint 里“导出为 PDF”后上传；服务器逐页转成图片。也可以直接传一组页面图片。
 * 内容红线：资料里不能有金额、会费价格、收款方式、收益承诺。PDF 里读到这类字样会标出第几页，只提醒、不自动改。
 */
import { useCallback, useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Doc = {
  id: string; slug: string; title: string; summary: string | null; cover_url: string | null; sort_order: number; is_public: boolean;
  pdf_url: string | null; pdf_site_url: string | null; pdf_bytes: number | null; pages: { url: string; w: number; h: number }[];
  red_flags: { page: number; words: string[] }[]; text_readable: boolean | null; open_count: number; share_count: number; pdf_count: number;
};
const mb = (n: number | null) => (n ? `${(n / 1048576).toFixed(1)} MB` : '');

export default function StaffDocs() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, { title: string; summary: string; sortOrder: string; isPublic: boolean }>>({});
  const [nw, setNw] = useState({ slug: '', title: '', summary: '' });
  const [prefix, setPrefix] = useState('test');

  const load = useCallback(async () => {
    const r = await api<{ docs: Doc[]; uploadPrefix: string }>('/api/v1/staff/docs');
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setDocs(r.data.docs);
    setPrefix(r.data.uploadPrefix);
    setEdit(Object.fromEntries(r.data.docs.map((d) => [d.id, { title: d.title, summary: d.summary ?? '', sortOrder: String(d.sort_order), isPublic: d.is_public }])));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy('new');
    const r = await api<{ doc: Doc }>('/api/v1/staff/docs', { body: nw });
    setBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setNw({ slug: '', title: '', summary: '' });
    setMsg({ ok: true, text: '已新建，下一步上传 PDF 或页面图片' });
    load();
  }
  async function save(d: Doc) {
    const e = edit[d.id];
    setBusy(d.id);
    const r = await api(`/api/v1/staff/docs/${d.id}`, { method: 'PATCH', body: { title: e.title, summary: e.summary, sortOrder: Number(e.sortOrder || 0), isPublic: e.isPublic } });
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: '已保存' } : { ok: false, text: r.message });
    if (r.ok) load();
  }
  async function remove(d: Doc) {
    if (!window.confirm(`删除「${d.title}」？小程序里马上看不到了。`)) return;
    const r = await api(`/api/v1/staff/docs/${d.id}`, { method: 'DELETE' });
    setMsg(r.ok ? { ok: true, text: '已删除' } : { ok: false, text: r.message });
    if (r.ok) load();
  }
  async function putFile(d: Doc, f: File, onPct?: (p: number) => void) {
    return upload(`${prefix}/docs/${d.id}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, '_')}`, f, { access: 'public', handleUploadUrl: '/api/v1/staff/docs/upload', onUploadProgress: onPct ? (e) => onPct(Math.round(e.percentage)) : undefined });
  }
  async function uploadPdf(d: Doc, f: File | null) {
    if (!f) return;
    setBusy(d.id);
    try {
      setMsg({ ok: true, text: `正在上传 PDF（${mb(f.size)}）…` });
      const b = await putFile(d, f, (p) => setMsg({ ok: true, text: `正在上传 PDF… ${p}%` }));
      setMsg({ ok: true, text: '上传好了，正在逐页转成图片（十几页大约半分钟）…' });
      const r = await api<{ doc: Doc }>(`/api/v1/staff/docs/${d.id}/pdf`, { body: { url: b.url } });
      if (!r.ok) throw new Error(r.message);
      const fl = r.data.doc.red_flags;
      setMsg({
        ok: !fl.length && r.data.doc.text_readable !== false,
        text: `已转好 ${r.data.doc.pages.length} 页。` +
          (fl.length ? `注意：这几页有可能影响小程序审核的字样（金额 / 会费 / 收益等），请决定删页还是换页——${fl.map((x) => `第 ${x.page} 页：${x.words.join('、')}`).join('；')}` : '') +
          (r.data.doc.text_readable === false ? '这个 PDF 是图片做的，系统读不到上面的字，请自己逐页核一遍有没有金额、会费、收款方式、收益承诺。' : '')
      });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message || '上传没成功，请再试一次' });
    }
    setBusy(null);
    load();
  }
  async function uploadImages(d: Doc, files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(d.id);
    try {
      const list = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, 'zh', { numeric: true }));
      const urls: string[] = [];
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        setMsg({ ok: true, text: `正在上传第 ${i + 1} / ${list.length} 张…` });
        urls.push((await putFile(d, f)).url);
      }
      setMsg({ ok: true, text: '正在整理页面…' });
      const r = await api<{ doc: Doc }>(`/api/v1/staff/docs/${d.id}/images`, { body: { urls } });
      if (!r.ok) throw new Error(r.message);
      setMsg({ ok: true, text: `已设好 ${r.data.doc.pages.length} 页（按文件名顺序）。原来的 PDF 原件已去掉（和新页面对不上了），需要的话点“只换 PDF 原件”重新传。图片读不到字，请自己核一遍有没有金额、会费、收款方式、收益承诺。` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message || '上传没成功，请再试一次' });
    }
    setBusy(null);
    load();
  }
  async function uploadPdfOnly(d: Doc, f: File | null) {
    if (!f) return;
    setBusy(d.id);
    try {
      const b = await putFile(d, f, (p) => setMsg({ ok: true, text: `正在上传 PDF 原件… ${p}%` }));
      const r = await api<{ doc: Doc }>(`/api/v1/staff/docs/${d.id}/pdf`, { body: { url: b.url, pagesFromPdf: false } });
      if (!r.ok) throw new Error(r.message);
      const fl = r.data.doc.red_flags;
      setMsg({ ok: !fl.length, text: 'PDF 原件已换好（页面图片没动）。' + (fl.length ? `注意：原件里有可能影响审核的字样——${fl.map((x) => `第 ${x.page} 页：${x.words.join('、')}`).join('；')}` : '') });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message || '上传没成功，请再试一次' });
    }
    setBusy(null);
    load();
  }

  return (
    <StaffGate title="商会资料" role="admin" wide>
      {() => (
        <>
          <p className={styles.lead}>小程序「商会资料」：一页一屏看、能转发给朋友、能查看 / 转发 PDF 原件。PPT 在 PowerPoint 里点「文件 → 导出 → PDF」再传。</p>
          <p className={styles.small}>红线：资料里不能有金额、会费价格、收款方式、收益承诺（小程序审核）。系统会提醒，删页还是换页由你定。</p>
          {msg && <p className={msg.ok ? styles.success : styles.error}>{msg.text}</p>}
          {docs === null ? <p className={styles.small}>正在读取…</p> : null}
          {docs?.map((d) => {
            const e = edit[d.id];
            if (!e) return null;
            return (
              <div key={d.id} className={styles.card} style={{ marginTop: 12 }}>
                <p className={styles.cardTitle}>{d.title} <span className={styles.small}>（{d.slug}）{d.is_public ? ' · 已公开' : ' · 未公开'}</span></p>
                <p className={styles.small}>打开 {d.open_count} 次 · 转发 {d.share_count} 次 · 看 PDF {d.pdf_count} 次 · {d.pages.length} 页{d.pdf_bytes ? ` · PDF ${mb(d.pdf_bytes)}` : ''}</p>
                {d.red_flags.length > 0 && <p className={styles.notice}>可能影响审核的字样：{d.red_flags.map((x) => `第 ${x.page} 页（${x.words.join('、')}）`).join('；')}</p>}
                {d.text_readable === false && d.pages.length > 0 && <p className={styles.small}>这份是图片做的，系统读不到字；请人工确认没有金额、会费、收款方式、收益承诺。</p>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.25rem 1rem' }}>
                  <label className={styles.field}><span className={styles.label}>标题</span><input className={styles.input} value={e.title} maxLength={40} onChange={(x) => setEdit({ ...edit, [d.id]: { ...e, title: x.target.value } })} /></label>
                  <label className={styles.field}><span className={styles.label}>一句话说明</span><input className={styles.input} value={e.summary} maxLength={80} onChange={(x) => setEdit({ ...edit, [d.id]: { ...e, summary: x.target.value } })} /></label>
                  <label className={styles.field}><span className={styles.label}>排序（小的在前）</span><input className={styles.input} inputMode="numeric" value={e.sortOrder} onChange={(x) => setEdit({ ...edit, [d.id]: { ...e, sortOrder: x.target.value.replace(/[^\d-]/g, '') } })} /></label>
                  <label className={styles.field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={e.isPublic} onChange={(x) => setEdit({ ...edit, [d.id]: { ...e, isPublic: x.target.checked } })} /> 公开（小程序里能看到）</label>
                </div>
                <div className={styles.btnRow}>
                  <button className={styles.btn} disabled={!!busy} onClick={() => save(d)}>{busy === d.id ? '处理中…' : '保存'}</button>
                  <label className={`${styles.btn} ${styles.btnGhost}`} style={{ cursor: 'pointer' }}>上传 PDF（逐页转图）<input type="file" accept="application/pdf" hidden onChange={(x) => { uploadPdf(d, x.target.files?.[0] ?? null); x.target.value = ''; }} /></label>
                  <label className={`${styles.btn} ${styles.btnQuiet}`} style={{ cursor: 'pointer' }}>改用一组页面图片<input type="file" accept="image/jpeg,image/png" multiple hidden onChange={(x) => { uploadImages(d, x.target.files); x.target.value = ''; }} /></label>
                  <label className={`${styles.btn} ${styles.btnQuiet}`} style={{ cursor: 'pointer' }}>只换 PDF 原件<input type="file" accept="application/pdf" hidden onChange={(x) => { uploadPdfOnly(d, x.target.files?.[0] ?? null); x.target.value = ''; }} /></label>
                  {d.pdf_site_url && <a className={`${styles.btn} ${styles.btnQuiet}`} href={d.pdf_site_url} target="_blank" rel="noreferrer">看 PDF 原件</a>}
                  <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={!!busy} onClick={() => remove(d)}>删除</button>
                </div>
                {d.pages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 8 }}>
                    {d.pages.map((p, i) => (
                      <a key={p.url} href={p.url} target="_blank" rel="noreferrer" style={{ position: 'relative', display: 'block' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`第 ${i + 1} 页`} loading="lazy" style={{ width: '100%', borderRadius: 4, border: d.red_flags.some((x) => x.page === i + 1) ? '3px solid #E3C57A' : '1px solid rgba(255,255,255,0.15)' }} />
                        <span className={styles.small}>第 {i + 1} 页</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className={styles.card} style={{ marginTop: 16 }}>
            <p className={styles.cardTitle}>新建一份资料</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.25rem 1rem' }}>
              <label className={styles.field}><span className={styles.label}>标题</span><input className={styles.input} value={nw.title} maxLength={40} onChange={(x) => setNw({ ...nw, title: x.target.value })} placeholder="比如：会员权益" /></label>
              <label className={styles.field}><span className={styles.label}>一句话说明</span><input className={styles.input} value={nw.summary} maxLength={80} onChange={(x) => setNw({ ...nw, summary: x.target.value })} /></label>
              <label className={styles.field}><span className={styles.label}>英文短名（网址里用，可不填）</span><input className={styles.input} value={nw.slug} maxLength={40} onChange={(x) => setNw({ ...nw, slug: x.target.value })} placeholder="member-benefits" /></label>
            </div>
            <div className={styles.btnRow}><button className={styles.btn} disabled={!!busy || !nw.title.trim()} onClick={create}>{busy === 'new' ? '新建中…' : '新建'}</button></div>
          </div>
        </>
      )}
    </StaffGate>
  );
}
