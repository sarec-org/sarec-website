'use client';
/**
 * 保存到本人账户 + 生成分享图（工具页公用）。
 * - 未登录：只能算不能存，按钮变成“登录后保存”，登录完回到本页。
 * - 分享图：浏览器里用 canvas 画，不上传服务器；手机能分享就调系统分享，不能就下载 PNG。
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import type { Locale } from '@/lib/i18n/types';
import { DISCLAIMER, L } from './ToolShell';
import s from '@/components/crm/crm.module.css';
import t from './tools.module.css';

type Saved<I> = { id: string; title: string; inputs: I; created_at: string };

/** path：分享图底部印的网址，用本工具自己的页面 */
export type ShareCard = { title: string; path: string; lines: [string, string][]; highlight: [string, string] };

export function SavePanel<I extends object>({
  tool,
  lang,
  inputs,
  defaultTitle,
  onLoad,
  share
}: {
  tool: string;
  lang: Locale;
  inputs: I;
  defaultTitle: string;
  onLoad: (i: I) => void;
  share: () => ShareCard;
}) {
  const [items, setItems] = useState<Saved<I>[] | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ items: Saved<I>[] }>(`/api/v1/tools/saves?tool=${encodeURIComponent(tool)}`);
    if (r.ok) { setLoggedIn(true); setItems(r.data.items); }
    else if (r.status === 401) setLoggedIn(false);
    else { setLoggedIn(true); setItems([]); setMsg(r.message); }
  }, [tool]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await api('/api/v1/tools/saves', { body: { tool, title: title.trim() || defaultTitle, inputs } });
    setBusy(false);
    if (!r.ok) {
      if (r.status === 401) setLoggedIn(false);
      return setMsg(r.message);
    }
    setTitle('');
    setMsg(L(lang, '已保存到“我的计算”。', 'Saved to My calculations.'));
    load();
  };
  const remove = async (id: string) => {
    const r = await api(`/api/v1/tools/saves?id=${id}`, { method: 'DELETE' });
    if (!r.ok) return setMsg(r.message);
    load();
  };

  const makeImage = async () => {
    const url = drawShareCard(share(), lang);
    setImg(url);
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `sarec-${tool}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: share().title });
        return;
      }
    } catch { /* 用户取消分享，或浏览器不支持：下面直接提供下载 */ }
  };

  const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/zh/tools/${tool}`;

  return (
    <div className={s.card}>
      <h2 className={s.h2} style={{ marginTop: 0 }}>{L(lang, '保存与分享', 'Save & share')}</h2>
      {loggedIn === false ? (
        <p className={s.muted}>
          {L(lang, '不登录也能计算；登录后可以把结果存到本人账户。', 'You can calculate without signing in; sign in to save results to your account.')}{' '}
          <a href={`/zh/signin?next=${encodeURIComponent(next)}`} style={{ color: 'var(--gold)' }}>{L(lang, '登录后保存', 'Sign in to save')}</a>
        </p>
      ) : loggedIn ? (
        <>
          <label className={s.field}>
            <span className={s.label}>{L(lang, '名称（可不填）', 'Name (optional)')}</span>
            <input className={s.input} value={title} maxLength={80} placeholder={defaultTitle} onChange={(e) => setTitle(e.target.value)} />
          </label>
        </>
      ) : null}
      <div className={s.btnRow}>
        {loggedIn && <button type="button" className={s.btn} disabled={busy} onClick={save}>{L(lang, '保存结果', 'Save result')}</button>}
        <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={makeImage}>{L(lang, '生成分享图', 'Create share image')}</button>
      </div>
      {msg && <p className={s.small} role="status">{msg}</p>}
      {img && (
        <>
          <img src={img} alt={L(lang, '分享图预览', 'Share image preview')} className={t.preview} />
          <p className={s.small} style={{ textAlign: 'center' }}>
            <a href={img} download={`sarec-${tool}.png`} style={{ color: 'var(--gold)' }}>{L(lang, '下载图片', 'Download image')}</a>
            {L(lang, '（手机上也可以长按图片保存）', ' (or long-press to save on mobile)')}
          </p>
        </>
      )}
      {loggedIn && items && items.length > 0 && (
        <>
          <h3 className={s.label} style={{ margin: '1.25rem 0 0.25rem' }}>{L(lang, '我的计算', 'My calculations')}</h3>
          <ul className={t.saved}>
            {items.map((it) => (
              <li key={it.id}>
                <span>
                  {it.title || defaultTitle}
                  <br />
                  <span className={s.small}>{new Date(it.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </span>
                <span>
                  <button type="button" className={t.linkBtn} onClick={() => { onLoad(it.inputs); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{L(lang, '载入', 'Load')}</button>
                  <button type="button" className={t.linkBtn} onClick={() => remove(it.id)}>{L(lang, '删除', 'Delete')}</button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** 画一张 1080×1350 的藏蓝金分享图，返回 data URL */
export function drawShareCard(c: ShareCard, lang: Locale): string {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  const serif = '"Noto Serif SC", "Songti SC", Georgia, serif';
  const sans = '"PingFang SC", "Source Han Sans SC", Inter, Arial, sans-serif';
  g.fillStyle = '#040B16'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(201,165,103,0.55)'; g.lineWidth = 2; g.strokeRect(48, 48, W - 96, H - 96);
  g.fillStyle = '#C9A567'; g.font = `600 30px ${sans}`; g.fillText('SAREC · 中美房地产商会', 96, 150);
  // 标题尽量一行：放不下就逐级缩小字号（最小 44px），再放不下才折行（验收：不留“准）”孤字）
  g.fillStyle = '#F2EAD6';
  let size = 60;
  g.font = `600 ${size}px ${serif}`;
  while (size > 44 && g.measureText(c.title).width > W - 192) {
    size -= 2;
    g.font = `600 ${size}px ${serif}`;
  }
  wrap(g, c.title, 96, 250, W - 192, Math.round(size * 1.27));
  // 重点数字
  g.fillStyle = 'rgba(242,234,214,0.74)'; g.font = `32px ${sans}`; g.fillText(c.highlight[0], 96, 420);
  g.fillStyle = '#ECD292'; g.font = `600 112px ${serif}`; g.fillText(c.highlight[1], 96, 540);
  // 明细
  let y = 660;
  g.font = `34px ${sans}`;
  for (const [k, v] of c.lines.slice(0, 9)) {
    g.fillStyle = 'rgba(242,234,214,0.74)'; g.textAlign = 'left'; g.fillText(k, 96, y);
    g.fillStyle = '#F2EAD6'; g.textAlign = 'right'; g.fillText(v, W - 96, y);
    g.strokeStyle = 'rgba(232,220,196,0.16)'; g.lineWidth = 1; g.beginPath(); g.moveTo(96, y + 22); g.lineTo(W - 96, y + 22); g.stroke();
    y += 62;
  }
  g.textAlign = 'left';
  g.fillStyle = 'rgba(242,234,214,0.6)'; g.font = `26px ${sans}`;
  g.fillText(L(lang, DISCLAIMER.zh, DISCLAIMER.en), 96, H - 140);
  g.fillStyle = '#C9A567'; g.fillText(`sinoamericanrec.org${c.path}`, 96, H - 96);
  return cv.toDataURL('image/png');
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = '';
  for (const ch of Array.from(text)) {
    if (g.measureText(line + ch).width > maxW && line) { g.fillText(line, x, y); line = ch; y += lh; }
    else line += ch;
  }
  if (line) g.fillText(line, x, y);
}
