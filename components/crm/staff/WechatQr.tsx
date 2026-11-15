'use client';
/**
 * 换商会微信二维码（原来在「增长与设置」页，1.4.0 挪进「设置」，东哥已点头）。
 * 读写还是原来的接口：GET /api/v1/staff/growth 里的 settings.wechat_qr_url；POST multipart 换图。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { shrink } from '@/components/crm/staff/RoomsV12';
import { api } from '@/components/crm/client';

export function WechatQr() {
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ settings: Record<string, unknown> }>('/api/v1/staff/growth?days=7');
    if (r.ok) setQr(String(r.data.settings.wechat_qr_url ?? ''));
    else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('file', await shrink(file, 1000));
    const res = await fetch('/api/v1/staff/growth', { method: 'POST', body: fd, credentials: 'same-origin' }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false);
    setMsg(j?.ok ? { ok: true, text: '商会微信二维码已更换，小程序和网站立即生效' } : { ok: false, text: j?.error?.message ?? '上传没成功，请检查网络后再试一次' });
    load();
  }
  return (
    <div className={styles.card}>
      {msg && <p className={msg.ok ? styles.success : styles.error} role="status">{msg.text}</p>}
      <p className={styles.small} style={{ marginTop: 0 }}>
        小程序和网站里所有“加商会微信”的地方都显示这张图（报名成功页、签到成功页、首页、相册、会议室、联系商会、商会介绍页）。换图立即生效，不用发新版本。个人号加满时上传新号的码即可。
      </p>
      {qr === null ? (
        <p className={styles.muted}>正在读取…</p>
      ) : qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="商会微信二维码" style={{ width: 180, height: 180, objectFit: 'contain', background: '#fff', display: 'block', marginBottom: 12 }} />
      ) : (
        <p className={styles.notice}>还没有上传。没上传时，小程序只显示“联系商会”和电话。</p>
      )}
      <label className={styles.btn} style={{ cursor: 'pointer', width: '100%', position: 'relative', boxSizing: 'border-box' }}>
        {busy ? '上传中…' : qr ? '更换二维码图片' : '上传二维码图片'}
        <input
          type="file"
          accept="image/*"
          aria-label="上传商会微信二维码"
          disabled={busy}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = '';
          }}
        />
      </label>
      <p className={styles.small} style={{ marginBottom: 0 }}>手机上点按钮可以直接从相册选截图（微信 → 我 → 二维码名片 → 保存图片）。</p>
    </div>
  );
}
