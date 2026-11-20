'use client';
/** 拍照 / 选照片：手机上点了直接打开相机或相册；传好显示小图，可以删 */
import { useRef, useState } from 'react';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';

export function PhotoPicker({ photos, max, onChange, label = '拍照 / 加照片', endpoint = '/api/v1/jobs/upload?kind=photo', hint }: { photos: string[]; max: number; onChange: (p: string[]) => void; label?: string; endpoint?: string; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    const list = Array.from(files).slice(0, Math.max(0, max - photos.length));
    let next = [...photos];
    for (const f of list) {
      setBusy((n) => n + 1);
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await fetch(endpoint, { method: 'POST', body: fd, credentials: 'same-origin' });
        const json = (await res.json().catch(() => null)) as { ok: boolean; url?: string; error?: { message: string } } | null;
        if (json?.ok && json.url) next = [...next, json.url];
        else setErr(res.status === 401 ? '登录后才能传照片（下面登录一下就好）。' : json?.error?.message ?? '照片没传上，请再试一次');
      } catch {
        setErr('网络不稳定，照片没传上，请再试一次');
      }
      setBusy((n) => n - 1);
      onChange(next);
    }
    if (input.current) input.current.value = '';
  }
  return (
    <div>
      <div className={j.photos}>
        {photos.map((u) => (
          <div key={u} className={j.photo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" />
            <button type="button" aria-label="删掉这张" onClick={() => onChange(photos.filter((x) => x !== u))}>×</button>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" className={j.addPhoto} onClick={() => input.current?.click()} disabled={busy > 0}>
            {busy > 0 ? '正在传…' : label}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => pick(e.target.files)} />
      <p className={s.small} style={{ margin: '0.3rem 0 0' }}>{hint ?? `最多 ${max} 张，选填。`}</p>
      {err && <div className={s.error}>{err}</div>}
    </div>
  );
}
