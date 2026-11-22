'use client';
/**
 * 1.5.0 俱乐部（运营）：专委会与俱乐部的后台。
 * - 俱乐部：新建 / 编辑（英文短名、名字、简介、仅会员、排序、负责人会员号）/ 关闭 / 重新打开；群二维码上传 + 过期日期（快过期、已过期标红）。
 * - 组局：待检测的排最前，可「放行」；可「下架」（填理由）、「恢复」。
 * - 禁止名单：按会员号，或从组局的发起人一键「禁止此人」；「解除」。
 * - 操作记录：谁、什么时候、做了什么。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';
import { shrink } from '@/components/crm/staff/RoomsV12';
import { findContactByNo, Lightbox, uploadForm, Toast } from '@/components/crm/staff/ugcShared';

type Club = {
  id: string; key: string; name: string; intro: string | null; members_only: boolean; leader_contact_id: string | null; leader_name: string | null;
  group_qr_url: string | null; group_qr_expires: string | null; sort_order: number; icon?: string | null; cover_url?: string | null; closed_at: string | null; members: number; open_meetups: number;
};
type Meetup = {
  id: string; title: string; starts_at: string; location: string | null; capacity: number; note: string | null; status: string; sec_status: string;
  club: string; club_key: string; creator: string | null; creator_id: string; joined: number;
};
type Ban = { contact_id: string; name: string | null; reason: string | null; banned_by: string; banned_at: string };
type Action = { kind: string; target_id: string | null; action: string; actor: string; note: string | null; created_at: string };
type Data = { clubs: Club[]; meetups: Meetup[]; bans: Ban[]; actions: Action[] };
type Form = { editing: boolean; key: string; name: string; intro: string; membersOnly: boolean; sortOrder: string; icon: string; leaderNo: string; dropLeader: boolean; leaderName: string | null };

const ACTION_TEXT: Record<string, string> = {
  save: '保存了俱乐部', close_club: '关闭了俱乐部', reopen_club: '重新打开了俱乐部', set_qr: '换了群二维码', take_down: '下架了组局', restore: '恢复了组局',
  approve: '放行了组局', ban: '禁止了', unban: '解除禁止', remove: '移出了成员'
};

/** 群二维码状态：服务器给的是日期（可能带时间），只取前 10 位 */
function qrState(c: Club): { text: string; bad: boolean } {
  if (!c.group_qr_url) return { text: '还没上传群二维码', bad: true };
  const d = (c.group_qr_expires ?? '').slice(0, 10);
  if (!d) return { text: '已上传（没写过期日期）', bad: false };
  const today = new Date().toLocaleDateString('en-CA');
  const days = Math.round((new Date(d + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400e3);
  if (days < 0) return { text: `已过期（${d}），请马上换新的`, bad: true };
  if (days <= 3) return { text: `快过期了：${d}（还剩 ${days} 天），请换新的`, bad: true };
  return { text: `${d} 过期`, bad: false };
}
const blankForm = (): Form => ({ editing: false, key: '', name: '', intro: '', membersOnly: false, sortOrder: '0', icon: '', leaderNo: '', dropLeader: false, leaderName: null });
const plus7 = () => new Date(Date.now() + 7 * 86400e3).toLocaleDateString('en-CA');

function Clubs() {
  const [d, setD] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closeMsg = useCallback(() => setMsg(null), []);
  const [busy, setBusy] = useState('');
  const [f, setF] = useState<Form | null>(null);
  const [qrExp, setQrExp] = useState<Record<string, string>>({});
  const [clubFilter, setClubFilter] = useState('');
  const [downId, setDownId] = useState('');
  const [downReason, setDownReason] = useState('');
  const [banNo, setBanNo] = useState('');
  const [banReason, setBanReason] = useState('');
  const [big, setBig] = useState<string | null>(null);
  const [showAllLog, setShowAllLog] = useState(false);

  const load = useCallback(async () => {
    const r = await api<Data>('/api/v1/staff/clubs');
    if (r.ok) setD(r.data); else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: Record<string, unknown>, tag: string, suffix = ''): Promise<boolean> {
    setBusy(tag);
    const r = await api<{ message: string }>('/api/v1/staff/clubs', { body });
    setBusy('');
    setMsg(r.ok ? { ok: true, text: r.data.message + suffix } : { ok: false, text: r.message });
    if (r.ok) load();
    return r.ok;
  }
  async function saveClub() {
    if (!f) return;
    if (!f.key.trim() || !f.name.trim()) return setMsg({ ok: false, text: '请填英文短名和名字' });
    const body: Record<string, unknown> = { action: 'save_club', key: f.key, name: f.name, intro: f.intro, membersOnly: f.membersOnly, sortOrder: Number(f.sortOrder) || 0, icon: f.icon };
    // 负责人：填了会员号就换；勾了「去掉负责人」就清空；都没有就不动
    if (f.leaderNo) body.leaderMemberNo = f.leaderNo;
    else if (f.dropLeader) body.leaderMemberNo = '';
    if (await post(body, 'save')) setF(null);
  }
  async function uploadQr(c: Club, file: File) {
    setBusy('qr' + c.key);
    const fd = new FormData();
    fd.append('file', await shrink(file, 1200), 'qr.jpg');
    fd.append('key', c.key);
    fd.append('expires', qrExp[c.key] || plus7());
    const r = await uploadForm<{ message: string }>('/api/v1/staff/clubs/qr', fd);
    setBusy('');
    setMsg(r.ok ? { ok: true, text: `「${c.name}」${r.data.message}` } : { ok: false, text: r.message });
    if (r.ok) load();
  }
  // 1.5.0 体验1：首页「专委会与俱乐部」方块的封面
  async function uploadCover(c: Club, file: File) {
    setBusy('cover' + c.key);
    const fd = new FormData();
    fd.append('file', await shrink(file, 1600), 'cover.jpg');
    fd.append('key', c.key);
    const r = await uploadForm<{ message: string }>('/api/v1/staff/clubs/cover', fd);
    setBusy('');
    setMsg(r.ok ? { ok: true, text: `「${c.name}」${r.data.message}` } : { ok: false, text: r.message });
    if (r.ok) load();
  }
  async function banByNo() {
    setMsg(null);
    const c = await findContactByNo(banNo);
    if (!c.ok) return setMsg({ ok: false, text: c.message });
    if (await post({ action: 'ban', contactId: c.id, reason: banReason }, 'ban', `：${c.name}`)) { setBanNo(''); setBanReason(''); }
  }

  if (!d) return <><Toast m={msg} onClose={closeMsg} /><p className={styles.muted}>正在加载…</p></>;
  const banned = new Set(d.bans.map((b) => b.contact_id));
  const meetupTitle = new Map(d.meetups.map((m) => [m.id, `「${m.title}」（${m.club}）`]));
  const clubName = new Map(d.clubs.map((c) => [c.key, `「${c.name}」`]));
  const personName = new Map<string, string>([...d.meetups.map((m) => [m.creator_id, m.creator ?? 'SAREC 用户'] as [string, string]), ...d.bans.map((b) => [b.contact_id, b.name ?? 'SAREC 用户'] as [string, string])]);
  const target = (a: Action) => {
    const t = a.target_id ?? '';
    if (a.kind === 'meetup') return meetupTitle.get(t) ?? '一个组局';
    if (a.kind === 'club') return clubName.get(t) ?? `「${t}」`;
    if (a.kind === 'club_ban') return personName.get(t) ?? '一位用户';
    if (a.kind === 'club_member') { const [k, id] = t.split(':'); return `${personName.get(id) ?? '一位成员'}（${clubName.get(k) ?? k}）`; }
    return t;
  };
  const meetups = d.meetups.filter((m) => !clubFilter || m.club_key === clubFilter);
  const pendingN = d.meetups.filter((m) => m.sec_status === 'pending' && m.status === 'open').length;
  const qrAlerts = d.clubs.filter((c) => !c.closed_at && qrState(c).bad && c.group_qr_url);
  const logs = showAllLog ? d.actions : d.actions.slice(0, 15);

  return (
    <>
      <p className={styles.lead}>小程序首页「专委会与俱乐部」后面的管理。点「加入」立刻生效；组局文字先过微信检测，检测不通的在下面「组局」最前面等放行。</p>
      {(pendingN > 0 || qrAlerts.length > 0) && (
        <div className={styles.error}>
          {pendingN > 0 && <div>有 {pendingN} 个组局待检测，成员还看不到（见下面「组局」）。</div>}
          {qrAlerts.map((c) => <div key={c.key}>「{c.name}」群二维码{qrState(c).text}。</div>)}
        </div>
      )}
      <Toast m={msg} onClose={closeMsg} />

      <h2 className={styles.h}>俱乐部（{d.clubs.filter((c) => !c.closed_at).length} 个开着）</h2>
      {d.clubs.map((c) => {
        const q = qrState(c);
        return (
          <div key={c.key} className={styles.card} style={{ opacity: c.closed_at ? 0.65 : 1 }}>
            <p className={styles.cardTitle}>
              {c.name}
              {c.members_only && <span className={styles.badge}>仅会员</span>}
              {c.closed_at && <span className={`${styles.badge} ${styles.badgeMuted}`}>已关闭</span>}
            </p>
            <p className={styles.small} style={{ margin: 0 }}>{c.icon ? `${c.icon} · ` : ''}英文短名 {c.key} · 排序 {c.sort_order}（小程序首页方块按这个排，数字小的在前） · 成员 {c.members} 人 · 进行中组局 {c.open_meetups} 个 · 负责人：{c.leader_name ?? '没指定'}</p>
            {c.intro && <p style={{ margin: '0.3rem 0' }}>{c.intro}</p>}
            {!c.closed_at && (
              <div style={{ borderTop: '1px solid var(--line-2)', marginTop: 8, paddingTop: 8 }}>
                <p style={{ margin: '0 0 6px' }}>群二维码：<span className={q.bad ? `${styles.badge} ${styles.badgeRed}` : ''} style={q.bad ? { marginLeft: 0, fontWeight: 600 } : undefined}>{q.text}</span></p>
                {c.group_qr_url && (
                  <button onClick={() => setBig(c.group_qr_url)} aria-label="看群二维码大图" style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.group_qr_url} alt={`${c.name} 群二维码`} style={{ width: 96, height: 96, objectFit: 'contain', background: '#fff', borderRadius: 4 }} />
                  </button>
                )}
                <div className={styles.inputRow} style={{ alignItems: 'center' }}>
                  <label className={styles.small} htmlFor={`exp-${c.key}`} style={{ flex: '0 0 auto' }}>新码过期日期</label>
                  <input id={`exp-${c.key}`} type="date" className={styles.input} style={{ flex: '1 1 160px' }} value={qrExp[c.key] ?? plus7()} onChange={(e) => setQrExp({ ...qrExp, [c.key]: e.target.value })} />
                  <label className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                    {busy === 'qr' + c.key ? '正在传…' : c.group_qr_url ? '换群二维码' : '上传群二维码'}
                    <input type="file" accept="image/*" hidden disabled={!!busy} onChange={(e) => { const x = e.target.files?.[0]; if (x) uploadQr(c, x); e.target.value = ''; }} />
                  </label>
                </div>
                <p className={styles.small} style={{ margin: '4px 0 0' }}>微信群二维码一般 7 天过期；到期前 3 天这里会标红，成员页也会提示“已提醒负责人更换”。</p>
              </div>
            )}
            <div className={styles.inputRow} style={{ alignItems: 'center', marginTop: 8 }}>
              {c.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.cover_url} alt={`${c.name} 封面`} style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 4 }} />
              )}
              <label className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
                {busy === 'cover' + c.key ? '正在传…' : c.cover_url ? '换封面' : '上传封面（小程序首页方块用，可不传）'}
                <input type="file" accept="image/*" hidden disabled={!!busy} onChange={(e) => { const x = e.target.files?.[0]; if (x) uploadCover(c, x); e.target.value = ''; }} />
              </label>
            </div>
            <div className={styles.btnRow} style={{ marginTop: 10 }}>
              <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setMsg(null); setF({ editing: true, key: c.key, name: c.name, intro: c.intro ?? '', membersOnly: c.members_only, sortOrder: String(c.sort_order), icon: c.icon ?? '', leaderNo: '', dropLeader: false, leaderName: c.leader_name }); setTimeout(() => document.getElementById('club-form')?.scrollIntoView({ behavior: 'smooth' }), 50); }}>编辑</button>
              {c.closed_at
                ? <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'reopen_club', key: c.key }, 'c' + c.key, `：「${c.name}」`)}>重新打开</button>
                : <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'close_club', key: c.key }, 'c' + c.key, `：「${c.name}」`)}>关闭俱乐部</button>}
            </div>
          </div>
        );
      })}
      {!f && <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setMsg(null); setF(blankForm()); }}>＋ 新建俱乐部</button>}

      {f && (
        <div id="club-form" className={`${styles.card} ${styles.cardGold}`}>
          <p className={styles.cardTitle}>{f.editing ? `编辑「${f.name}」` : '新建俱乐部'}</p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cl-key">英文短名<span className={styles.required}>*</span>（小写字母、数字、横线，建好后不能改）</label>
            <input id="cl-key" className={styles.input} value={f.key} disabled={f.editing} maxLength={30} placeholder="例如 guandan" onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cl-name">名字<span className={styles.required}>*</span>（20 字以内）</label>
            <input id="cl-name" className={styles.input} value={f.name} maxLength={20} placeholder="例如 掼蛋俱乐部" onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cl-intro">简介（一句话，200 字以内）</label>
            <textarea id="cl-intro" className={styles.textarea} value={f.intro} maxLength={200} onChange={(e) => setF({ ...f, intro: e.target.value })} />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, marginBottom: '1rem' }}>
            <input type="checkbox" checked={f.membersOnly} onChange={(e) => setF({ ...f, membersOnly: e.target.checked })} style={{ width: 22, height: 22 }} />
            仅会员能加入（不勾 = 注册用户都能加入）
          </label>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cl-sort">排序（数字小的排前面；小程序首页「专委会与俱乐部」方块也按这个排）</label>
            <input id="cl-sort" className={styles.input} inputMode="numeric" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value.replace(/[^\d-]/g, '') })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cl-icon">方块图标（一个表情或 1–2 个字，例如 🃏；不填 = 小程序用名字第一个字）</label>
            <input id="cl-icon" className={styles.input} value={f.icon} maxLength={8} placeholder="🃏" onChange={(e) => setF({ ...f, icon: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cl-leader">负责人会员号（负责人可以在小程序里换群二维码、下架组局、移出成员）</label>
            {f.editing && <p className={styles.small} style={{ margin: 0 }}>现在的负责人：{f.leaderName ?? '没指定'}。不填 = 不改。</p>}
            <input id="cl-leader" className={styles.input} inputMode="numeric" placeholder="例如 1024" value={f.leaderNo} onChange={(e) => setF({ ...f, leaderNo: e.target.value.replace(/\D/g, ''), dropLeader: false })} />
            {f.editing && f.leaderName && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
                <input type="checkbox" checked={f.dropLeader} onChange={(e) => setF({ ...f, dropLeader: e.target.checked, leaderNo: '' })} style={{ width: 22, height: 22 }} />
                去掉负责人
              </label>
            )}
          </div>
          <div className={styles.btnRow}>
            <button className={styles.btn} disabled={busy === 'save'} onClick={saveClub}>{busy === 'save' ? '保存中…' : '保存'}</button>
            <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => { setF(null); setMsg(null); }}>不改了</button>
          </div>
        </div>
      )}

      <h2 className={styles.h}>组局（{meetups.length}）</h2>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="mf">看哪个俱乐部的</label>
        <select id="mf" className={styles.select} value={clubFilter} onChange={(e) => setClubFilter(e.target.value)}>
          <option value="">全部俱乐部</option>
          {d.clubs.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
      </div>
      <p className={styles.small}>待检测的排最前：内容没过微信检测（或检测接口一时不通）时成员看不到，只有发起人自己看得到。看过没问题点「放行」。</p>
      {meetups.length === 0 && <p className={styles.notice}>还没有组局。</p>}
      {meetups.map((m) => {
        const past = new Date(m.starts_at).getTime() < Date.now();
        const pending = m.sec_status !== 'ok';
        return (
          <div key={m.id} className={`${styles.card} ${pending && m.status === 'open' ? styles.cardGold : ''}`}>
            <p className={styles.cardTitle}>
              {m.title}
              {m.sec_status === 'pending' && <span className={`${styles.badge} ${styles.badgeRed}`}>待检测 · 成员看不到</span>}
              {m.sec_status === 'rejected' && <span className={`${styles.badge} ${styles.badgeRed}`}>没通过检测</span>}
              {m.status === 'taken_down' && <span className={`${styles.badge} ${styles.badgeMuted}`}>已下架</span>}
              {m.status === 'cancelled' && <span className={`${styles.badge} ${styles.badgeMuted}`}>发起人已取消</span>}
              {m.status === 'open' && past && <span className={`${styles.badge} ${styles.badgeMuted}`}>已过时间</span>}
            </p>
            <p className={styles.small} style={{ margin: 0 }}>{m.club} · {fmtDateTime(m.starts_at)}{m.location ? ` · ${m.location}` : ''} · 已报 {m.joined} / {m.capacity} · 发起人 {m.creator ?? 'SAREC 用户'}{banned.has(m.creator_id) ? '（已禁止）' : ''}</p>
            {m.note && <p style={{ margin: '0.3rem 0' }}>{m.note}</p>}
            {downId === m.id ? (
              <div className={styles.inputRow} style={{ marginTop: 8 }}>
                <input className={styles.input} autoFocus placeholder="下架理由（会记在操作记录里）" aria-label="下架理由" value={downReason} onChange={(e) => setDownReason(e.target.value)} />
                <button className={`${styles.btn} ${styles.btnDanger}`} disabled={!!busy} onClick={async () => { if (await post({ action: 'take_down', id: m.id, reason: downReason }, 'm' + m.id, `：「${m.title}」`)) { setDownId(''); setDownReason(''); } }}>确认下架</button>
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setDownId('')}>不下架了</button>
              </div>
            ) : (
              <div className={styles.btnRow} style={{ marginTop: 8 }}>
                {m.sec_status !== 'ok' && m.status === 'open' && <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'approve', id: m.id }, 'm' + m.id, `：「${m.title}」`)}>放行</button>}
                {m.status === 'open' && <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => { setDownId(m.id); setDownReason(''); }}>下架</button>}
                {m.status === 'taken_down' && <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'restore', id: m.id }, 'm' + m.id, `：「${m.title}」`)}>恢复</button>}
                {banned.has(m.creator_id)
                  ? <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'unban', contactId: m.creator_id }, 'b', `：${m.creator ?? '发起人'}`)}>解除禁止此人</button>
                  : <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} disabled={!!busy} onClick={() => post({ action: 'ban', contactId: m.creator_id, reason: `组局「${m.title}」` }, 'b', `：${m.creator ?? '发起人'}`)}>禁止此人</button>}
              </div>
            )}
          </div>
        );
      })}

      <h2 className={styles.h}>禁止名单（{d.bans.length}）</h2>
      <div className={styles.card}>
        <p className={styles.small} style={{ marginTop: 0 }}>被禁止的人不能发起、也不能参加任何俱乐部的组局（仍能看到俱乐部）。可以随时解除。</p>
        <div className={styles.inputRow}>
          <input className={styles.input} inputMode="numeric" placeholder="会员号，例如 1024" aria-label="要禁止的会员号" value={banNo} onChange={(e) => setBanNo(e.target.value.replace(/\D/g, ''))} />
          <input className={styles.input} placeholder="理由（可不填）" aria-label="禁止理由" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
          <button className={`${styles.btn} ${styles.btnDanger}`} disabled={!banNo || !!busy} onClick={banByNo}>按会员号禁止</button>
        </div>
        {d.bans.length === 0 ? <p className={styles.small}>现在没有被禁止的人。</p> : (
          <ul className={styles.list}>
            {d.bans.map((b) => (
              <li key={b.contact_id} className={styles.listItem}>
                <div>{b.name ?? 'SAREC 用户'}{b.reason ? ` · 理由：${b.reason}` : ''}</div>
                <div className={styles.small}>{b.banned_by} 于 {fmtDateTime(b.banned_at)} 禁止</div>
                <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} style={{ marginTop: 6 }} disabled={!!busy} onClick={() => post({ action: 'unban', contactId: b.contact_id }, 'b', `：${b.name ?? '此人'}`)}>解除</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className={styles.h}>操作记录</h2>
      {d.actions.length === 0 ? <p className={styles.small}>还没有操作记录。</p> : (
        <ul className={styles.list}>
          {logs.map((a, i) => (
            <li key={i} className={styles.listItem} style={{ padding: '0.6rem 0' }}>
              <div>{a.actor.startsWith('leader:') ? `负责人 ${personName.get(a.actor.slice(7)) ?? ''}` : a.actor} {ACTION_TEXT[a.action] ?? a.action} {target(a)}{a.note ? `（${a.action === 'set_qr' ? `${a.note} 过期` : a.note}）` : ''}</div>
              <div className={styles.small}>{fmtDateTime(a.created_at)}</div>
            </li>
          ))}
        </ul>
      )}
      {d.actions.length > 15 && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setShowAllLog(!showAllLog)}>{showAllLog ? '收起' : `看全部 ${d.actions.length} 条`}</button>}
      <Lightbox url={big} onClose={() => setBig(null)} />
    </>
  );
}

export default function Page() {
  return (
    <StaffGate role="ops" title="俱乐部" wide>
      {() => <Clubs />}
    </StaffGate>
  );
}
