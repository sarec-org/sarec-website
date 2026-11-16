'use client';
/**
 * 相册（1.4.0，东哥定）：上传就是进相册，大家立刻能看到，不再有“发布”这道关。
 * - 按活动看照片墙；每张写清是谁传的（工作人员 / 会员姓名）。
 * - 事后管理：下架（可恢复）、往前排、禁止某人上传（可恢复，有记录）；已下架的才能彻底删除。
 * - 「通知到场的人：照片出来了」是单独的一个动作，和照片能不能看到无关。
 * - 也在这里上传活动封面；列出到场的人里谁同意了照片用于宣传。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { shrink } from '@/components/crm/staff/RoomsV12';
import { api, fmtDateTime } from '@/components/crm/client';

type Ev = { id: string; title: string; starts_at: string; event_status: string };
type Photo = {
  id: string; url: string; thumb_url: string; caption: string | null; sort_order: number; is_hidden: boolean;
  by_customer: boolean; uploader_contact_id: string | null; uploader_name: string | null; visibility: string; review_status: string; uploaded_by: string | null;
};
type Detail = { event: { id: string; slug: string; title: string; recap: string | null; album_published_at: string | null; cover_url: string | null }; photos: Photo[]; consent: { agreed: string[]; notAgreed: number } };
type Ban = { contactId: string; name: string | null; by: string; at: string };
type Filter = 'all' | 'staff' | 'guest' | 'hidden';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'staff', label: '工作人员传的' },
  { key: 'guest', label: '会员传的' },
  { key: 'hidden', label: '已下架' }
];

const isPublic = (p: Photo) => !p.is_hidden && p.visibility === 'album' && p.review_status === 'ok';
const who = (p: Photo) => (p.by_customer ? p.uploader_name || '会员（没留名字）' : '工作人员');

function Album() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [eventId, setEventId] = useState('');
  const [d, setD] = useState<Detail | null>(null);
  const [bans, setBans] = useState<Ban[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
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
      // 默认：网址里带的那场；否则最近一场已经开始的活动
      const def = list.find((e) => e.id === q) ?? list.find((e) => new Date(e.starts_at).getTime() < Date.now()) ?? list[0];
      if (def) setEventId(def.id);
    });
  }, []);
  const loadBans = useCallback(async () => {
    const r = await api<{ bans: Ban[] }>('/api/v1/staff/photo-bans');
    if (r.ok) setBans(r.data.bans);
  }, []);
  const load = useCallback(async () => {
    if (!eventId) return;
    const r = await api<Detail>(`/api/v1/staff/events/${eventId}/photos`);
    if (r.ok) { setD(r.data); setRecap(r.data.event.recap ?? ''); } else setMsg({ ok: false, text: r.message });
  }, [eventId]);
  useEffect(() => { load(); loadBans(); }, [load, loadBans]);

  async function uploadPhotos(files: FileList) {
    setMsg(null);
    let ok = 0;
    let fail = 0;
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      setBusy(`正在上传 ${i + 1} / ${list.length} …`);
      const fd = new FormData();
      fd.append('files', await shrink(list[i], 2400), list[i].name.replace(/\.\w+$/, '.jpg'));
      const res = await fetch(`/api/v1/staff/events/${eventId}/photos`, { method: 'POST', body: fd, credentials: 'same-origin' });
      const j = await res.json().catch(() => null);
      if (j?.ok && j.saved?.length) ok++; else fail++;
    }
    setBusy('');
    setMsg({ ok: fail === 0, text: `传好了 ${ok} 张，已经在相册里，大家都能看到${fail ? `；失败 ${fail} 张（已记入“待跟进 → 待处理”，可以重试）` : ''}` });
    load();
  }
  async function uploadCover(file: File) {
    const fd = new FormData();
    fd.append('file', await shrink(file, 1800));
    const res = await fetch(`/api/v1/staff/events/${eventId}/cover`, { method: 'POST', body: fd, credentials: 'same-origin' });
    const j = await res.json().catch(() => null);
    setMsg(j?.ok ? { ok: true, text: '封面已更新' } : { ok: false, text: j?.error?.message ?? '封面没传上，请再试一次' });
    load();
  }
  async function patch(p: Photo, b: Record<string, unknown>, done: string) {
    const r = await api(`/api/v1/staff/events/${eventId}/photos`, { method: 'PATCH', body: { photoId: p.id, ...b } });
    setMsg(r.ok ? { ok: true, text: done } : { ok: false, text: r.message });
    load();
  }
  async function remove(p: Photo) {
    // 不弹系统对话框：第一次点变成“确认彻底删除”，再点才删
    if (armed !== p.id) return setArmed(p.id);
    setArmed('');
    const r = await api(`/api/v1/staff/events/${eventId}/photos?photoId=${p.id}`, { method: 'DELETE' });
    setMsg(r.ok ? { ok: true, text: '已彻底删除这张照片' } : { ok: false, text: r.message });
    load();
  }
  async function ban(contactId: string, on: boolean, name: string) {
    const r = await api<{ bans: Ban[] }>('/api/v1/staff/photo-bans', { body: { contactId, ban: on } });
    if (r.ok) setBans(r.data.bans);
    setMsg(r.ok ? { ok: true, text: on ? `已禁止 ${name} 上传照片（他已经传的照片不受影响，可以单独下架）` : `已恢复 ${name} 上传照片` } : { ok: false, text: r.message });
  }
  async function notify(resend = false) {
    setBusy(resend ? '正在重推…' : '正在通知…');
    const r = await api<{ sent: number; home: number; failed: number }>(`/api/v1/staff/events/${eventId}/album`, { body: { recap, resend } });
    setBusy('');
    setMsg(r.ok ? { ok: r.data.failed === 0, text: `已通知。服务通知推送 ${r.data.sent} 人，小程序首页提示 ${r.data.home} 人${r.data.failed ? `，失败 ${r.data.failed} 人（可在“待跟进 → 待处理”重试）` : ''}` } : { ok: false, text: r.message });
    load();
  }

  const banned = new Set(bans.map((b) => b.contactId));
  const photos = (d?.photos ?? []).filter((p) =>
    filter === 'hidden' ? p.is_hidden : !p.is_hidden && (filter === 'all' || (filter === 'staff' ? !p.by_customer : p.by_customer))
  );
  const shown = d?.photos.filter(isPublic).length ?? 0;
  const count = (f: Filter) => (d?.photos ?? []).filter((p) => (f === 'hidden' ? p.is_hidden : !p.is_hidden && (f === 'all' || (f === 'staff' ? !p.by_customer : p.by_customer)))).length;

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ev">活动</label>
        <select id="ev" className={styles.select} value={eventId} onChange={(e) => { setEventId(e.target.value); setMsg(null); }}>
          {events.map((e) => <option key={e.id} value={e.id}>{fmtDateTime(e.starts_at)} · {e.title}</option>)}
        </select>
      </div>
      {msg && <p className={msg.ok ? styles.success : styles.error} role="status">{msg.text}</p>}
      {busy && <p className={styles.notice} role="status">{busy}</p>}
      {d && (
        <>
          <div className={styles.card}>
            <p className={styles.cardTitle}>传照片</p>
            <p className={styles.small}>可以一次选多张。传好就在相册里，大家马上都能看到（不加水印）。会员在小程序里传的照片也直接进相册。</p>
            <input type="file" accept="image/*" multiple aria-label="上传现场照片" disabled={!!busy} onChange={(e) => { if (e.target.files?.length) uploadPhotos(e.target.files); e.target.value = ''; }} />
          </div>

          <div className={styles.btnRow} role="tablist" aria-label="筛选照片" style={{ flexWrap: 'wrap', margin: '1rem 0 0.5rem' }}>
            {FILTERS.map((f) => (
              <button key={f.key} role="tab" aria-selected={filter === f.key} className={`${styles.btn} ${filter === f.key ? '' : styles.btnGhost}`} onClick={() => setFilter(f.key)}>
                {f.label}（{count(f.key)}）
              </button>
            ))}
          </div>
          <p className={styles.small}>相册里现在大家能看到 {shown} 张。{filter === 'hidden' ? '已下架的照片大家看不到，可以恢复，也可以彻底删除。' : '不合适的照片点「下架」，大家马上就看不到了，以后还能恢复。'}</p>

          {photos.length === 0 && <p className={styles.notice}>{filter === 'hidden' ? '没有下架的照片。' : '这一场还没有照片。'}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, margin: '0.5rem 0 1rem' }}>
            {photos.map((p) => (
              <div key={p.id} style={{ border: '1px solid var(--line-3)', background: 'var(--paper, #fff)' }}>
                <a href={p.url} target="_blank" rel="noreferrer" aria-label="看大图">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb_url} alt="现场照片" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', opacity: p.is_hidden ? 0.45 : 1 }} />
                </a>
                <div style={{ padding: '6px 8px', fontSize: 14 }}>
                  <div>{who(p)} 传的</div>
                  {!p.is_hidden && p.visibility !== 'album' && <div className={styles.small}>只有本人看得见（1.4 以前传的，没选公开）</div>}
                  {p.by_customer && p.uploader_contact_id && banned.has(p.uploader_contact_id) && <div className={styles.small} style={{ color: '#B3261E' }}>此人已被禁止上传</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, padding: '0 8px 8px', flexWrap: 'wrap' }}>
                  {p.is_hidden ? (
                    <>
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => patch(p, { hidden: false }, '已恢复，大家又能看到这张了')}>恢复</button>
                      <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(p)}>{armed === p.id ? '确认彻底删除' : '彻底删除'}</button>
                    </>
                  ) : (
                    <>
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => patch(p, { hidden: true }, '已下架，大家看不到这张了（在“已下架”里可以恢复）')}>下架</button>
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => patch(p, { sort: p.sort_order - 3 }, '已往前排')}>往前排</button>
                    </>
                  )}
                  {p.by_customer && p.uploader_contact_id && (
                    banned.has(p.uploader_contact_id)
                      ? <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => ban(p.uploader_contact_id!, false, who(p))}>恢复此人上传</button>
                      : <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => ban(p.uploader_contact_id!, true, who(p))}>禁止此人上传</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>通知到场的人：照片出来了</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="recap">一行回顾（小程序首页“上一场回顾”下方显示，可不填）</label>
              <input id="recap" className={styles.input} value={recap} onChange={(e) => setRecap(e.target.value)} placeholder="例如：AI 地产专题 · 100 人到场" />
            </div>
            <div className={styles.btnRow}>
              <button className={styles.btn} disabled={!shown || !!busy} onClick={() => notify(false)}>{d.event.album_published_at ? '保存回顾并补发通知' : '通知到场的人：照片出来了'}</button>
              {d.event.album_published_at && <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => notify(true)}>重推失败的通知</button>}
            </div>
            <p className={styles.small}>
              这只是发通知，照片能不能看到和它没关系（传好就能看到）。{d.event.album_published_at ? `已于 ${fmtDateTime(d.event.album_published_at)} 通知过。` : '还没通知过。'}
              授权过“照片已上传”订阅消息的人会收到服务通知；没授权的在小程序首页看到提示。重复点不会重复推送。
            </p>
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>活动封面</p>
            <p className={styles.small}>用于分享卡片、邀请海报和首页大图卡片。建议横图 3:2。</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {d.event.cover_url && <img src={d.event.cover_url} alt="活动封面" style={{ width: 240, maxWidth: '100%', aspectRatio: '3/2', objectFit: 'cover', border: '1px solid var(--line-3)' }} />}
            <div><input type="file" accept="image/*" aria-label="上传封面" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ''; }} /></div>
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>照片授权（签到时勾选）</p>
            <p className={styles.small} style={{ margin: 0 }}>
              到场的人里同意现场照片用于商会宣传：{d.consent.agreed.length ? d.consent.agreed.join('、') : '暂无'}；没勾选 {d.consent.notAgreed} 人。
              没有同意的人，能认出本人的照片请不要用于宣传。
            </p>
          </div>

          <div className={styles.card}>
            <p className={styles.cardTitle}>被禁止上传照片的人（{bans.length}）</p>
            {bans.length === 0 ? <p className={styles.small}>没有。</p> : (
              <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                {bans.map((b) => (
                  <li key={b.contactId} style={{ margin: '6px 0' }}>
                    {b.name || '（没留名字）'} · {b.by} 于 {fmtDateTime(b.at)} 禁止
                    <button className={`${styles.btn} ${styles.btnGhost}`} style={{ marginLeft: 8 }} onClick={() => ban(b.contactId, false, b.name || '此人')}>恢复上传</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role={['ops', 'checkin']} title="相册" wide>
      {() => <Album />}
    </StaffGate>
  );
}
