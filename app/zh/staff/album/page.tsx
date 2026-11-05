'use client';
/**
 * 活动相册（1.2）：上传现场照片（浏览器先压缩，服务器自动加商会水印）→ 隐藏 / 删除 / 排序 → 写一行回顾 → 发布并通知到场的人。
 * 也在这里上传活动封面（分享卡片、邀请海报、首页大图卡片用）。
 * 会员照片要本人在签到时勾选同意才能用：页面上列出到场的人里谁同意了。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { shrink } from '@/components/crm/staff/RoomsV12';
import { api, fmtDateTime } from '@/components/crm/client';

type Ev = { id: string; title: string; starts_at: string; event_status: string };
type Photo = { id: string; url: string; thumb_url: string; caption: string | null; sort_order: number; is_hidden: boolean };
type Detail = { event: { id: string; slug: string; title: string; recap: string | null; album_published_at: string | null; cover_url: string | null }; photos: Photo[]; consent: { agreed: string[]; notAgreed: number } };

function Album() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [eventId, setEventId] = useState('');
  const [d, setD] = useState<Detail | null>(null);
  const [recap, setRecap] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [armed, setArmed] = useState('');

  useEffect(() => {
    api<{ events: Ev[] }>('/api/v1/staff/events').then((r) => {
      if (!r.ok) return;
      const list = [...r.data.events].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
      setEvents(list);
      const q = new URLSearchParams(location.search).get('event');
      // 默认：最近一场已经开始的活动
      const def = list.find((e) => e.id === q) ?? list.find((e) => new Date(e.starts_at).getTime() < Date.now()) ?? list[0];
      if (def) setEventId(def.id);
    });
  }, []);
  const load = useCallback(async () => {
    if (!eventId) return;
    const r = await api<Detail>(`/api/v1/staff/events/${eventId}/photos`);
    if (r.ok) { setD(r.data); setRecap(r.data.event.recap ?? ''); } else setMsg({ ok: false, text: r.message });
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  async function uploadPhotos(files: FileList) {
    setMsg(null);
    let ok = 0;
    let fail = 0;
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      setBusy(`正在上传 ${i + 1} / ${list.length}（加水印）…`);
      const fd = new FormData();
      fd.append('files', await shrink(list[i], 2400), list[i].name.replace(/\.\w+$/, '.jpg'));
      const res = await fetch(`/api/v1/staff/events/${eventId}/photos`, { method: 'POST', body: fd, credentials: 'same-origin' });
      const j = await res.json().catch(() => null);
      if (j?.ok && j.saved?.length) ok++; else fail++;
    }
    setBusy('');
    setMsg({ ok: fail === 0, text: `上传成功 ${ok} 张${fail ? `，失败 ${fail} 张（已记入“待处理”）` : ''}` });
    load();
  }
  async function uploadCover(file: File) {
    const fd = new FormData();
    fd.append('file', await shrink(file, 1800));
    const res = await fetch(`/api/v1/staff/events/${eventId}/cover`, { method: 'POST', body: fd, credentials: 'same-origin' });
    const j = await res.json().catch(() => null);
    setMsg(j?.ok ? { ok: true, text: '封面已更新' } : { ok: false, text: j?.error?.message ?? '上传失败' });
    load();
  }
  async function patch(p: Photo, b: Record<string, unknown>) {
    await api(`/api/v1/staff/events/${eventId}/photos`, { method: 'PATCH', body: { photoId: p.id, ...b } });
    load();
  }
  async function remove(p: Photo) {
    // 不弹系统对话框：第一次点变成“确认删除”，再点才删
    if (armed !== p.id) return setArmed(p.id);
    setArmed('');
    await api(`/api/v1/staff/events/${eventId}/photos?photoId=${p.id}`, { method: 'DELETE' });
    load();
  }
  async function publish(resend = false) {
    setBusy(resend ? '正在重推…' : '正在发布…');
    const r = await api<{ sent: number; home: number; failed: number }>(`/api/v1/staff/events/${eventId}/album`, { body: { recap, resend } });
    setBusy('');
    setMsg(r.ok ? { ok: r.data.failed === 0, text: `已发布。服务通知推送 ${r.data.sent} 人，首页提示 ${r.data.home} 人${r.data.failed ? `，失败 ${r.data.failed} 人（可在“待处理”重试）` : ''}` } : { ok: false, text: r.message });
    load();
  }

  const shown = d?.photos.filter((p) => !p.is_hidden).length ?? 0;
  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ev">活动</label>
        <select id="ev" className={styles.select} value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{fmtDateTime(e.starts_at)} · {e.title}</option>)}
        </select>
      </div>
      {msg && <p className={msg.ok ? styles.success : styles.error} role="status">{msg.text}</p>}
      {busy && <p className={styles.notice} role="status">{busy}</p>}
      {d && (
        <>
          <div className={styles.card}>
            <p className={styles.cardTitle}>活动封面</p>
            <p className={styles.small}>用于分享卡片、邀请海报和首页大图卡片。建议横图 3:2。</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {d.event.cover_url && <img src={d.event.cover_url} alt="活动封面" style={{ width: 240, aspectRatio: '3/2', objectFit: 'cover', border: '1px solid var(--line-3)' }} />}
            <div><input type="file" accept="image/*" aria-label="上传封面" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ''; }} /></div>
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>照片授权（签到时勾选）</p>
            <p className={styles.small} style={{ margin: 0 }}>
              到场的人里同意现场照片用于商会宣传：{d.consent.agreed.length ? d.consent.agreed.join('、') : '暂无'}；未勾选 {d.consent.notAgreed} 人。
              没有同意的会员，请不要发布能认出本人的照片。
            </p>
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>上传现场照片</p>
            <p className={styles.small}>可一次选多张。上传时自动转正方向、压缩，并在右下角加商会印章水印。</p>
            <input type="file" accept="image/*" multiple aria-label="上传现场照片" disabled={!!busy} onChange={(e) => { if (e.target.files?.length) uploadPhotos(e.target.files); e.target.value = ''; }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, margin: '1rem 0' }}>
            {d.photos.map((p) => (
              <div key={p.id} style={{ border: '1px solid var(--line-3)', opacity: p.is_hidden ? 0.4 : 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb_url} alt="现场照片" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                <div style={{ display: 'flex', gap: 4, padding: 6, flexWrap: 'wrap' }}>
                  <button className={styles.chip} onClick={() => patch(p, { hidden: !p.is_hidden })}>{p.is_hidden ? '显示' : '隐藏'}</button>
                  <button className={styles.chip} onClick={() => patch(p, { sort: p.sort_order - 3 })} aria-label="往前排">↑</button>
                  <button className={styles.chip} onClick={() => remove(p)}>{armed === p.id ? '确认删除' : '删除'}</button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="recap">一行回顾（首页“上一场回顾”下方显示）</label>
              <input id="recap" className={styles.input} value={recap} onChange={(e) => setRecap(e.target.value)} placeholder="例如：AI 地产专题 · 100 人到场" />
            </div>
            <div className={styles.btnRow}>
              <button className={styles.btn} disabled={!shown || !!busy} onClick={() => publish(false)}>{d.event.album_published_at ? '保存回顾并补发通知' : `发布相册（${shown} 张）并通知到场的人`}</button>
              {d.event.album_published_at && <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => publish(true)}>重推失败的通知</button>}
            </div>
            <p className={styles.small}>
              {d.event.album_published_at ? `已于 ${fmtDateTime(d.event.album_published_at)} 发布。` : '尚未发布，小程序里看不到。'}
              授权过“照片已上传”订阅消息的人会收到服务通知；没授权的在小程序首页看到提示。重复点击不会重复推送。
            </p>
          </div>
        </>
      )}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="活动相册" wide>
      {() => <Album />}
    </StaffGate>
  );
}
