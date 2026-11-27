'use client';
/**
 * 指令 103：活动页「讲座课件」——从活动直接「传课件」。
 * - 只收 PDF。PPT 给明确提示：先另存为 PDF 再传（Mac 上用桌面的『双击我_PPT转PDF』）。服务器直接转 PPT 要付费服务，没做。
 * - 浏览器直传图片存储（PDF 常常超过 4.5MB），再让服务器加工：手机版压图、最后加一页扫码页、逐页转图、直接公开。
 * - 每份：默认所有人能看能下；「仅会员看完整版」开关（和「内容 › 商会资料」同一个口径）；先不公开；下载专属小程序码。
 * - 带 ?slides=1 进来（工作台「上传这场的课件」）滚到这里、描金边。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import styles from '@/components/crm/crm.module.css';
import { api } from '@/components/crm/client';

type Slide = {
  id: string; slug: string; title: string; isPublic: boolean; audience: 'all' | 'members'; pageCount: number; pdfBytes: number | null; fullBytes: number | null;
  qrUrl: string | null; pdfUrl: string | null; fullUrl: string | null; redFlags: { page: number; words: string[] }[]; textReadable: boolean | null;
};
type Data = { event: { id: string; title: string; ended: boolean; skipped: boolean }; docs: Slide[]; uploadPrefix: string };
const mb = (n: number | null) => (n ? `${(n / 1048576).toFixed(1)} MB` : '');
export const PPT_HINT = '这是 PPT：请先另存为 PDF 再传（Mac 上用桌面的『双击我_PPT转PDF』，或 PowerPoint「文件 › 导出 › PDF」）。';

export function EventSlides({ eventId }: { eventId: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [focus, setFocus] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await api<Data>(`/api/v1/staff/events/${eventId}/slides`);
    if (r.ok) setD(r.data);
    else setMsg({ ok: false, text: r.message });
  }, [eventId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (new URLSearchParams(location.search).get('slides') === '1') setFocus(true);
  }, []);
  useEffect(() => {
    if (focus && d && box.current) box.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus, d]);

  async function send(f: File | null) {
    if (!f || !d) return;
    if (/\.(pptx?|key|potx?)$/i.test(f.name)) return setMsg({ ok: false, text: PPT_HINT });
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return setMsg({ ok: false, text: '只能传 PDF。PPT 请先另存为 PDF 再传。' });
    if (f.size > 60 * 1024 * 1024) return setMsg({ ok: false, text: 'PDF 太大了（最多 60MB）' });
    setBusy(true);
    try {
      setMsg({ ok: true, text: `正在上传（${mb(f.size)}）…` });
      const b = await upload(`${d.uploadPrefix}/docs/ev-${eventId}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, '_')}`, f, {
        access: 'public', handleUploadUrl: '/api/v1/staff/docs/upload', onUploadProgress: (e) => setMsg({ ok: true, text: `正在上传… ${Math.round(e.percentage)}%` })
      });
      setMsg({ ok: true, text: '上传好了，正在做手机版、加扫码页、逐页转图（十几页大约半分钟到一分钟）…' });
      const r = await api<Data & { message: string }>(`/api/v1/staff/events/${eventId}/slides`, { body: { url: b.url, name: f.name, audience: membersOnly ? 'members' : 'all' } });
      if (!r.ok) throw new Error(r.message);
      setMsg({ ok: !r.data.docs.some((x) => x.redFlags.length), text: r.data.message });
      setD((x) => (x ? { ...x, docs: r.data.docs, event: r.data.event } : x));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message || '上传没成功，请再试一次' });
    }
    setBusy(false);
  }
  async function change(doc: Slide, patch: { isPublic?: boolean; audience?: 'all' | 'members' }) {
    setBusy(true);
    const r = await api<Data & { message: string }>(`/api/v1/staff/events/${eventId}/slides`, { body: { docId: doc.id, ...patch } });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) setD((x) => (x ? { ...x, docs: r.data.docs } : x));
  }
  async function skip() {
    setBusy(true);
    const r = await api<{ message: string }>(`/api/v1/staff/events/${eventId}/slides`, { body: { skip: true } });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: r.data.message } : { ok: false, text: r.message });
    if (r.ok) load();
  }

  return (
    <div ref={box} id="slides" style={{ scrollMarginTop: 140 }}>
      <h2 className={styles.h2}>讲座课件</h2>
      <div className={styles.card} style={focus ? { outline: '3px solid #E3C57A', outlineOffset: 2 } : undefined}>
        <p className={styles.small} style={{ marginTop: 0 }}>
          传上来大家就能在小程序里翻看、下载、转发（转发卡片标题「课件｜讲座名」），看板自动出「讲座课件已上传 · 可下载」。
          <strong>只收 PDF</strong>：PPT 请先另存为 PDF 再传（Mac 上用桌面的『双击我_PPT转PDF』）。系统会做一份手机版（压图，10MB 以内）、最后加一页「扫码下载本场课件」，原稿留给电脑下载。
        </p>
        {msg && <p className={msg.ok ? styles.success : styles.error}>{msg.text}</p>}
        {d === null ? <p className={styles.small}>正在读取…</p> : null}
        {d && !d.docs.length && <p className={styles.small}>这场还没挂课件。{d.event.skipped ? '（已标「这场没有课件」，工作台不再提醒）' : ''}</p>}
        {d?.docs.map((x) => (
          <div key={x.id} style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: '8px 0' }}>
            <p className={styles.cardTitle} style={{ margin: '0 0 4px' }}>
              {x.title} <span className={styles.small}>{x.isPublic ? '· 已公开' : '· 未公开'} · {x.audience === 'members' ? '仅会员看完整版' : '所有人能看能下'}</span>
            </p>
            <p className={styles.small} style={{ margin: '0 0 6px' }}>
              {x.pageCount} 页{x.pdfBytes ? ` · 手机版 ${mb(x.pdfBytes)}` : ''}{x.fullBytes ? ` · 原稿 ${mb(x.fullBytes)}` : ''}
            </p>
            {x.redFlags.length > 0 && <p className={styles.notice}>可能影响小程序审核的字样：{x.redFlags.map((f) => `第 ${f.page} 页（${f.words.join('、')}）`).join('；')}</p>}
            {x.textReadable === false && <p className={styles.small}>这份是图片做的 PDF，系统读不到字，请自己翻一遍有没有金额、会费、收款方式、收益承诺。</p>}
            <div className={styles.btnRow}>
              {x.qrUrl && <a className={`${styles.btn} ${styles.btnGhost}`} href={x.qrUrl} download>下载小程序码</a>}
              {x.pdfUrl && <a className={`${styles.btn} ${styles.btnQuiet}`} href={x.pdfUrl} target="_blank" rel="noreferrer">看手机版 PDF</a>}
              {x.fullUrl && <a className={`${styles.btn} ${styles.btnQuiet}`} href={x.fullUrl} target="_blank" rel="noreferrer">原稿</a>}
              <label className={styles.small} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" disabled={busy} checked={x.audience === 'members'} onChange={(e) => change(x, { audience: e.target.checked ? 'members' : 'all' })} /> 仅会员看完整版
              </label>
              <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy} onClick={() => change(x, { isPublic: !x.isPublic })}>{x.isPublic ? '先不公开' : '公开'}</button>
            </div>
          </div>
        ))}
        <div className={styles.btnRow} style={{ marginTop: 8 }}>
          <label className={styles.btn} style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? '处理中…' : d?.docs.length ? '再传一份课件（PDF）' : '传课件（PDF）'}
            <input type="file" accept="application/pdf,.pdf,.ppt,.pptx" hidden disabled={busy} onChange={(e) => { send(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </label>
          <label className={styles.small} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={membersOnly} onChange={(e) => setMembersOnly(e.target.checked)} /> 这份仅会员看完整版（不勾 = 所有人能看能下）
          </label>
          {d && !d.docs.length && d.event.ended && !d.event.skipped && <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={busy} onClick={skip}>这场没有课件</button>}
        </div>
        <p className={styles.small} style={{ marginBottom: 0 }}>小程序 1.7.2 起，讲座现场也能用手机传：工作台 › 这场活动 › 传课件（从微信聊天记录里选 PDF）。</p>
      </div>
    </div>
  );
}
