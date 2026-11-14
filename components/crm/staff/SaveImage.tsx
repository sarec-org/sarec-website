'use client';
/**
 * 1.4.0（1.3.5 第 11 条）：后台所有“下载图片”统一走这里。
 * - 电脑：照常下载文件。
 * - 手机：不再只存进“文件”。弹出一层，图直接显示 + “长按图片存到相册” +「分享 / 存相册」按钮
 *   （navigator.share 带图片文件，iPhone 选“存储图像”、安卓选相册 / 微信；浏览器不支持时退回下载）。
 * 用法：saveImage(blob 或 图片地址, 文件名)。页面上只要挂一个 <SaveImageHost />（后台导航里已挂）。
 */
import { useEffect, useState } from 'react';

const EVT = 'sarec-save-image';
type Req = { blob: Blob; name: string };

/** 手机 / 平板（触屏为主）才弹层；电脑直接下载 */
export function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod|Android|Mobile|MicroMessenger/i.test(ua)) return true;
  // iPadOS 13+ 自称 Mac：靠触屏判断
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** 存图：src 可以是 Blob，也可以是同站图片地址（会先取回来）。返回 'download' | 'sheet'，失败抛错（大白话） */
export async function saveImage(src: Blob | string, name: string): Promise<'download' | 'sheet'> {
  let blob: Blob;
  if (typeof src === 'string') {
    const res = await fetch(src, { credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
    if (!res || !res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) {
      const j = (await res?.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(j?.error?.message || '图片这会儿生成不了，请过 1 分钟再点一次');
    }
    blob = await res.blob();
  } else blob = src;
  if (!isPhone()) {
    downloadBlob(blob, name);
    return 'download';
  }
  window.dispatchEvent(new CustomEvent<Req>(EVT, { detail: { blob, name } }));
  return 'sheet';
}

/** 给页面提示用：电脑说“已开始下载”，手机说“长按图片存到相册” */
export function savedText(how: 'download' | 'sheet', what = '图片') {
  return how === 'download' ? `${what}已开始下载` : `${what}已打开：长按图片存到相册，或点「分享 / 存相册」`;
}

export function SaveImageHost() {
  const [req, setReq] = useState<(Req & { url: string }) | null>(null);
  const [tip, setTip] = useState('');
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<Req>).detail;
      setTip('');
      setReq((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { ...d, url: URL.createObjectURL(d.blob) };
      });
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  if (!req) return null;
  const close = () => {
    URL.revokeObjectURL(req.url);
    setReq(null);
  };
  async function share() {
    if (!req) return;
    const file = new File([req.blob], req.name, { type: req.blob.type || 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: req.name });
        setTip('已打开分享。iPhone 选「存储图像」就进相册；也可以直接发给微信好友。');
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') setTip('这个浏览器分享不了图片，请长按上面的图片，选「存储图像」/「保存图片」。');
      }
      return;
    }
    downloadBlob(req.blob, req.name);
    setTip('这个浏览器不支持直接分享图片，已改为下载。也可以长按上面的图片，选「保存图片」存进相册。');
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="存图片"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(2,6,16,0.985)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '1rem 16px 2rem', color: 'var(--ivory)' }}
    >
      <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '1.15rem', fontWeight: 600, textAlign: 'center' }}>长按图片存到相册</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={req.url} alt={req.name} style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', background: '#fff', borderRadius: 6, WebkitTouchCallout: 'default' } as React.CSSProperties} />
      <p style={{ margin: '0.6rem 0', fontSize: '0.9rem', color: 'var(--ivory-mute)', textAlign: 'center', wordBreak: 'break-all' }}>{req.name}</p>
      {tip && <p style={{ margin: '0 0 0.6rem', fontSize: '0.95rem', textAlign: 'center', maxWidth: 420 }}>{tip}</p>}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 420 }}>
        <button type="button" onClick={share} style={{ flex: 1, minHeight: 52, borderRadius: 6, border: '1px solid var(--gold)', background: 'var(--gold)', color: 'var(--ink-deepest)', fontSize: '1.05rem', fontWeight: 600 }}>
          分享 / 存相册
        </button>
        <button type="button" onClick={close} style={{ flex: '0 0 96px', minHeight: 52, borderRadius: 6, border: '1px solid var(--line-3)', background: 'transparent', color: 'var(--ivory)', fontSize: '1.05rem' }}>
          关闭
        </button>
      </div>
    </div>
  );
}
