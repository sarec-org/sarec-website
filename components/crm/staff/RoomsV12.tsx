'use client';
/**
 * 1.2 会议室改咨询制（后台部分）：
 * - 线下预约登记：工作人员电话 / 微信谈好后记一笔（同一时段已有预约会被拒绝，后台日历防撞期）；可同时登记收款。
 * - 会议室展示信息：照片、容纳人数、设备、介绍、会员优惠说明、地址（小程序会议室页只显示这些，不显示任何价格）。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api } from '@/components/crm/client';

type Room = { id: number; name: string; capacity: number | null; equipment: string | null; intro: string | null; photos: string[] };
type Person = { id: string; member_no: number; name: string; phone_e164: string | null; email: string | null };

async function upload(url: string, file: File): Promise<{ ok: boolean; url?: string; message?: string }> {
  const fd = new FormData();
  fd.append('file', await shrink(file, 1800));
  const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
  const j = await res.json().catch(() => null);
  return j?.ok ? { ok: true, url: j.url ?? j.coverUrl } : { ok: false, message: j?.error?.message ?? '上传失败' };
}

/** 浏览器里先压缩（长边 maxSide，JPEG 0.86），保证单次上传不超过服务器限制 */
export async function shrink(file: File, maxSide = 2400): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)/.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function RoomsV12({ onBooked }: { onBooked: () => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [notice, setNotice] = useState('');
  const [address, setAddress] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[] | null>(null);
  const [pick, setPick] = useState<Person | null>(null);
  const [f, setF] = useState({ roomId: '', newName: '', date: new Date().toISOString().slice(0, 10), start: '10:00', end: '12:00', note: '', amount: '', provider: 'zelle', reference: '' });

  const load = useCallback(async () => {
    const r = await api<{ rooms: Room[]; notice: string }>('/api/v1/staff/room-info');
    if (r.ok) {
      setRooms(r.data.rooms);
      setNotice(r.data.notice);
      if (!f.roomId && r.data.rooms[0]) setF((x) => ({ ...x, roomId: String(r.data.rooms[0].id) }));
    }
    const g = await api<{ settings: Record<string, unknown> }>('/api/v1/staff/growth?days=1');
    if (g.ok) setAddress(String(g.data.settings.room_address ?? ''));
  }, [f.roomId]);
  useEffect(() => { load(); }, [load]);

  async function search() {
    const r = await api<{ contacts: Person[] }>(`/api/v1/staff/contacts?q=${encodeURIComponent(q)}`);
    if (r.ok) setPeople(r.data.contacts.slice(0, 8));
  }
  const toIso = (d: string, t: string) => {
    // 按洛杉矶时间解释（自动处理夏令时）
    const guess = new Date(`${d}T${t}:00Z`);
    const la = new Date(guess.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    return new Date(guess.getTime() + (guess.getTime() - la.getTime())).toISOString();
  };
  async function book() {
    setMsg(null);
    const amount = Math.round(Number(f.amount) * 100);
    const r = await api('/api/v1/staff/bookings', {
      body: {
        roomId: Number(f.roomId), contactId: pick?.id, newName: pick ? undefined : f.newName,
        startsAt: toIso(f.date, f.start), endsAt: toIso(f.date, f.end), note: f.note,
        payment: amount > 0 ? { amountCents: amount, provider: f.provider, reference: f.reference } : null
      }
    });
    setMsg(r.ok ? { ok: true, text: '已登记预约' + (amount > 0 ? '和收款' : '') } : { ok: false, text: r.message });
    if (r.ok) { setPick(null); setPeople(null); setQ(''); setF({ ...f, newName: '', note: '', amount: '', reference: '' }); onBooked(); }
  }
  async function saveRoom(r: Room) {
    const res = await api('/api/v1/staff/room-info', { body: { id: r.id, capacity: r.capacity, equipment: r.equipment ?? '', intro: r.intro ?? '', photoUrls: r.photos } });
    setMsg(res.ok ? { ok: true, text: `「${r.name}」已保存` } : { ok: false, text: res.message });
  }
  async function saveSetting(key: string, value: string) {
    const res = await api('/api/v1/staff/growth', { body: { key, value } });
    setMsg(res.ok ? { ok: true, text: '已保存' } : { ok: false, text: res.message });
  }
  const setRoom = (id: number, patch: Partial<Room>) => setRooms((rs) => rs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <>
      {msg && <p className={msg.ok ? styles.success : styles.error} role="status">{msg.text}</p>}
      <h2 className={styles.h2}>线下预约登记</h2>
      <p className={styles.small}>小程序不再在线预约。会员电话或微信谈好后，在这里记一笔；同一时段已有预约会被拒绝。会员能在小程序“我的 → 会议室预约记录”看到。</p>
      <div className={styles.card}>
        <div className={styles.inputRow}>
          <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜会员：姓名 / 手机 / 邮箱 / 编号" aria-label="搜索会员" />
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={search}>搜索</button>
        </div>
        {people && (
          <div className={styles.chips}>
            {people.map((p) => (
              <button key={p.id} className={`${styles.chip} ${pick?.id === p.id ? styles.chipOn : ''}`} onClick={() => setPick(p)}>
                {p.name} · {p.phone_e164 ?? p.email ?? `#${p.member_no}`}
              </button>
            ))}
            {people.length === 0 && <span className={styles.small}>没找到，可直接填来访者姓名</span>}
          </div>
        )}
        <div className={styles.grid2}>
          {!pick && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="bk-name">来访者姓名（不是会员时填）</label>
              <input id="bk-name" className={styles.input} value={f.newName} onChange={(e) => setF({ ...f, newName: e.target.value })} />
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bk-room">会议室</label>
            <select id="bk-room" className={styles.select} value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bk-date">日期</label>
            <input id="bk-date" type="date" className={styles.input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bk-s">开始（洛杉矶时间）</label>
            <input id="bk-s" type="time" className={styles.input} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bk-e">结束</label>
            <input id="bk-e" type="time" className={styles.input} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bk-note">备注</label>
            <input id="bk-note" className={styles.input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="例如：项目路演，8 人" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bk-amt">已收金额（美元，没收可不填）</label>
            <input id="bk-amt" inputMode="decimal" className={styles.input} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bk-pv">收款方式</label>
            <select id="bk-pv" className={styles.select} value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })}>
              <option value="zelle">Zelle</option><option value="cash">现金</option><option value="check">支票</option><option value="waived">免费 / 抵扣</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bk-ref">银行参考号（可选）</label>
            <input id="bk-ref" className={styles.input} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
          </div>
        </div>
        <button className={styles.btn} onClick={book} disabled={!pick && !f.newName.trim()}>登记预约</button>
      </div>

      <h2 className={styles.h2}>会议室展示信息（小程序会议室页）</h2>
      <p className={styles.small}>小程序只显示照片、容纳人数、设备、介绍、地址和会员优惠说明，不显示任何价格。这里也不要写金额。</p>
      {rooms.map((r) => (
        <div key={r.id} className={styles.card}>
          <p className={styles.cardTitle}>{r.name}</p>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`cap-${r.id}`}>容纳人数</label>
              <input id={`cap-${r.id}`} inputMode="numeric" className={styles.input} value={r.capacity ?? ''} onChange={(e) => setRoom(r.id, { capacity: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`eq-${r.id}`}>设备</label>
              <input id={`eq-${r.id}`} className={styles.input} value={r.equipment ?? ''} onChange={(e) => setRoom(r.id, { equipment: e.target.value })} placeholder="例如：大屏投影、白板、视频会议" />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`in-${r.id}`}>介绍</label>
            <textarea id={`in-${r.id}`} className={styles.textarea} value={r.intro ?? ''} onChange={(e) => setRoom(r.id, { intro: e.target.value })} />
          </div>
          <div className={styles.chips}>
            {r.photos.map((u) => (
              <span key={u} style={{ position: 'relative', display: 'inline-block' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="会议室照片" style={{ width: 120, height: 80, objectFit: 'cover', border: '1px solid var(--line-3)' }} />
                <button className={styles.chip} style={{ position: 'absolute', right: 2, top: 2, padding: '0 6px' }} aria-label="删除这张照片" onClick={() => setRoom(r.id, { photos: r.photos.filter((x) => x !== u) })}>×</button>
              </span>
            ))}
          </div>
          <label className={styles.label} htmlFor={`ph-${r.id}`}>添加照片</label>
          <input id={`ph-${r.id}`} type="file" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const up = await upload('/api/v1/staff/room-info', file);
            if (up.ok && up.url) setRoom(r.id, { photos: [...r.photos, up.url] }); else setMsg({ ok: false, text: up.message ?? '上传失败' });
            e.target.value = '';
          }} />
          <div className={styles.btnRow}><button className={styles.btn} onClick={() => saveRoom(r)}>保存</button></div>
        </div>
      ))}
      <div className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="room-notice">会员优惠说明（不写金额）</label>
          <input id="room-notice" className={styles.input} value={notice} onChange={(e) => setNotice(e.target.value)} />
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => saveSetting('room_notice', notice)}>保存说明</button>
        <div className={styles.field} style={{ marginTop: '1rem' }}>
          <label className={styles.label} htmlFor="room-addr">会议室地址（小程序显示）</label>
          <input id="room-addr" className={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => saveSetting('room_address', address)}>保存地址</button>
      </div>
    </>
  );
}
