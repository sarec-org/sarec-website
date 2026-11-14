'use client';
/**
 * 1.5.0 后台新页面（俱乐部、主页审核、商会风采……）共用的小工具：
 * - findContactByNo：按会员号找人（用现有的客户查询接口，会员号精确匹配）
 * - Lightbox：点图片看大图（点任意处或按 Esc 关）
 * - uploadForm：multipart 上传，统一返回 { ok, data | message }
 */
import { useEffect } from 'react';
import { api } from '@/components/crm/client';

export async function findContactByNo(no: string): Promise<{ ok: true; id: string; name: string } | { ok: false; message: string }> {
  const n = no.trim();
  if (!/^\d+$/.test(n)) return { ok: false, message: '请填数字会员号' };
  const r = await api<{ contacts: { id: string; member_no: number | null; name: string | null }[] }>(`/api/v1/staff/contacts?q=${encodeURIComponent(n)}`);
  if (!r.ok) return { ok: false, message: r.message };
  const c = r.data.contacts.find((x) => String(x.member_no) === n);
  if (!c) return { ok: false, message: `没找到会员号 ${n}，请在「客户」页查一下号码` };
  return { ok: true, id: c.id, name: `${c.name || 'SAREC 用户'}（会员号 ${n}）` };
}

export async function uploadForm<T>(url: string, fd: FormData): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
    const j = await res.json().catch(() => null);
    if (j?.ok) return { ok: true, data: j as T };
    return { ok: false, message: j?.error?.message ?? '图片没传上，请再试一次' };
  } catch {
    return { ok: false, message: '网络不稳定，图片没传上，请再试一次' };
  }
}

export function Lightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!url) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [url, onClose]);
  if (!url) return null;
  return (
    <div
      role="dialog"
      aria-label="大图"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="大图" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 100px)', objectFit: 'contain' }} />
      <button onClick={onClose} style={{ marginTop: 12, minHeight: 44, minWidth: 120, border: '1px solid #fff', background: 'transparent', color: '#fff', borderRadius: 6, fontSize: '1rem' }}>关闭大图</button>
    </div>
  );
}

/**
 * 操作结果提示（交互总则第 8 条）：页面很长时按钮离页面顶端很远，提示固定在屏幕底部，点哪里都看得见；
 * 成功的 6 秒后自己收起，失败的留着直到点「知道了」。
 */
export function Toast({ m, onClose }: { m: { ok: boolean; text: string } | null; onClose: () => void }) {
  useEffect(() => {
    if (!m?.ok) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [m, onClose]);
  if (!m) return null;
  return (
    <div
      role={m.ok ? 'status' : 'alert'}
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom))', zIndex: 90, maxWidth: 720, margin: '0 auto',
        display: 'flex', gap: 10, alignItems: 'center', padding: '0.7rem 0.9rem', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        background: m.ok ? '#1f4d33' : '#6b1f1f', color: '#fff', lineHeight: 1.5
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{m.ok ? '✓ ' : '没成功：'}{m.text}</span>
      <button onClick={onClose} style={{ minHeight: 44, minWidth: 64, border: '1px solid rgba(255,255,255,0.6)', background: 'transparent', color: '#fff', borderRadius: 6, fontSize: '0.95rem', flexShrink: 0 }}>知道了</button>
    </div>
  );
}
