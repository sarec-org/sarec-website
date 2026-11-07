'use client';
/**
 * 活动筹备清单（1.3 M）——手机能用：字大、按钮大，现场打开就能打勾。
 * 上半：按截止时间排好的事项（打勾、备注、拍照）；中间：负责人分配；下半：拍摄清单、复盘。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type Item = { id: number; when_label: string; title: string; role: string; due_at: string; done_at: string | null; done_by: string | null; note: string | null; photo_url: string | null };
type Prep = {
  event_id: string; title: string; starts_at: string; template_key: string | null; roles: string[]; assignees: Record<string, { name: string; contact: string }>;
  shooting_list: string | null; retro: string | null; retro_applied_at: string | null; items: Item[];
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

export default function PrepPage({ params }: { params: { eventId: string } }) {
  const [p, setP] = useState<Prep | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [onlyMine, setOnlyMine] = useState('');
  const [retro, setRetro] = useState('');
  const [adding, setAdding] = useState({ title: '', role: '', days: '0', anchor: 'start' });
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const load = useCallback(async () => {
    const r = await api<{ prep: Prep | null }>(`/api/v1/staff/prep/${params.eventId}`);
    if (r.ok) {
      setP(r.data.prep);
      setRetro(r.data.prep?.retro ?? '');
    } else setMsg({ ok: false, text: r.message });
  }, [params.eventId]);
  useEffect(() => {
    load();
  }, [load]);
  const post = async (b: Record<string, unknown>, ok?: string) => {
    const r = await api(`/api/v1/staff/prep/${params.eventId}`, { body: b });
    if (!r.ok) setMsg({ ok: false, text: r.message });
    else if (ok) setMsg({ ok: true, text: ok });
    load();
    return r.ok;
  };
  async function upload(itemId: number, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('itemId', String(itemId));
    const res = await fetch(`/api/v1/staff/prep/${params.eventId}/photo`, { method: 'POST', body: fd, credentials: 'same-origin' }).catch(() => null);
    setMsg(res && res.ok ? { ok: true, text: '照片已加上' } : { ok: false, text: '照片没传上，请再试一次' });
    load();
  }
  const now = Date.now();
  const roles = p?.roles ?? [];
  const items = (p?.items ?? []).filter((i) => !onlyMine || i.role.split('、').includes(onlyMine));
  const big = { fontSize: '1.1rem' };
  return (
    <StaffGate title={p ? `筹备清单 · ${p.title}` : '筹备清单'} role={['ops', 'checkin']}>
      {(s) => (
        <>
          <Msg m={msg} />
          {!p && <p className={styles.muted}>这场活动还没有筹备清单。到活动详情页选活动类型生成。</p>}
          {p && (
            <>
              <p className={styles.small}>{fmt(p.starts_at)} 开始 · 已完成 {p.items.filter((i) => i.done_at).length} / {p.items.length}</p>
              <div className={styles.chips} style={{ marginBottom: 12 }}>
                <button className={`${styles.chip} ${!onlyMine ? styles.chipOn : ''}`} onClick={() => setOnlyMine('')}>全部</button>
                {roles.map((r) => (
                  <button key={r} className={`${styles.chip} ${onlyMine === r ? styles.chipOn : ''}`} onClick={() => setOnlyMine(r)}>{r}{p.assignees[r]?.name ? ` · ${p.assignees[r].name}` : ''}</button>
                ))}
              </div>

              {items.map((i) => {
                const late = !i.done_at && new Date(i.due_at).getTime() < now;
                return (
                  <div key={i.id} className={styles.card} style={{ borderColor: late ? '#e7a1a1' : i.done_at ? 'var(--signal-green)' : undefined, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <button
                        aria-label={i.done_at ? '取消打勾' : '打勾完成'}
                        onClick={() => post({ action: 'toggle', itemId: i.id, done: !i.done_at })}
                        style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 10, border: '2px solid var(--gold)', background: i.done_at ? 'var(--signal-green)' : 'transparent', color: '#fff', fontSize: 30, lineHeight: '48px', cursor: 'pointer' }}
                      >
                        {i.done_at ? '✓' : ''}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...big, margin: 0, textDecoration: i.done_at ? 'line-through' : 'none', opacity: i.done_at ? 0.6 : 1 }}>{i.title}</p>
                        <p className={styles.small} style={{ margin: '4px 0 0' }}>
                          {i.when_label} · {fmt(i.due_at)} 前 · {i.role}
                          {late ? ' · 已过截止时间' : ''}
                          {i.done_at ? ` · ${i.done_by ?? ''} 已完成` : ''}
                        </p>
                        {i.note && <p className={styles.small} style={{ margin: '4px 0 0' }}>备注：{i.note}</p>}
                        {i.photo_url && (
                          <a href={i.photo_url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={i.photo_url} alt="现场照片" style={{ width: 120, marginTop: 6, display: 'block' }} />
                          </a>
                        )}
                        <div className={styles.btnRow} style={{ marginTop: 6 }}>
                          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => { setNoteFor(i.id); setNote(i.note ?? ''); }}>备注</button>
                          <label className={`${styles.btn} ${styles.btnQuiet}`} style={{ cursor: 'pointer' }}>
                            拍照 / 传照片
                            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(i.id, f); e.target.value = ''; }} />
                          </label>
                          {can(s, 'ops') && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => post({ action: 'delete', itemId: i.id }, '这场删掉了这一项（复盘时可以同步到模板）')}>这场不需要</button>}
                        </div>
                        {noteFor === i.id && (
                          <div className={styles.inputRow} style={{ marginTop: 8 }}>
                            <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="写一句备注" aria-label="备注" />
                            <button className={styles.btn} onClick={async () => { if (await post({ action: 'note', itemId: i.id, note })) setNoteFor(null); }}>保存</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {can(s, 'ops') && (
                <div className={styles.card}>
                  <p className={styles.cardTitle}>这场临时加一项</p>
                  <input className={styles.input} value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} placeholder="事项内容" aria-label="事项内容" />
                  <div className={styles.inputRow} style={{ marginTop: 8 }}>
                    <select className={styles.select} value={adding.role} onChange={(e) => setAdding({ ...adding, role: e.target.value })} aria-label="负责角色">
                      <option value="">负责角色</option>
                      {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select className={styles.select} value={adding.anchor} onChange={(e) => setAdding({ ...adding, anchor: e.target.value })} aria-label="相对">
                      <option value="start">活动开始前（天）</option>
                      <option value="end">活动结束后（天）</option>
                    </select>
                    <input className={styles.input} type="number" min={0} max={60} value={adding.days} onChange={(e) => setAdding({ ...adding, days: e.target.value })} aria-label="天数" />
                  </div>
                  <button
                    className={styles.btn}
                    style={{ marginTop: 8 }}
                    disabled={!adding.title.trim() || !adding.role}
                    onClick={async () => {
                      const days = Math.max(0, Number(adding.days) || 0);
                      const offset = (adding.anchor === 'start' ? -1 : 1) * days * 1440;
                      if (await post({ action: 'add', item: { title: adding.title, role: adding.role, anchor: adding.anchor, offsetMinutes: offset } }, '已加上（复盘时可以一键加进模板）')) setAdding({ title: '', role: '', days: '0', anchor: 'start' });
                    }}
                  >
                    加一项
                  </button>
                </div>
              )}

              <h2 className={styles.h2}>负责人</h2>
              <div className={styles.card}>
                <p className={styles.small}>每个角色分给一个人：姓名 + 邮箱（截止前一天会发邮件提醒）或手机。同一人可以多个角色。摄影摄像必须专人，不兼签到。</p>
                {roles.map((r) => (
                  <AssignRow key={r} role={r} who={p.assignees[r]} onSave={(name, contact) => post({ action: 'assign', role: r, name, contact }, `已分配：${r}`)} />
                ))}
              </div>

              {p.shooting_list && (
                <>
                  <h2 className={styles.h2}>拍摄清单（印给摄影人）</h2>
                  <pre className={styles.card} style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '1.05rem' }}>{p.shooting_list}</pre>
                  <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => window.print()}>打印</button>
                </>
              )}

              <h2 className={styles.h2}>复盘</h2>
              <div className={styles.card}>
                <p className={styles.small}>这次缺了什么、多余什么。上面“这场临时加的项”“这场不需要的项”和改过的字，点下面的按钮一键同步进模板，下次自动带上。</p>
                <textarea className={styles.input} style={{ minHeight: 120 }} value={retro} onChange={(e) => setRetro(e.target.value)} aria-label="复盘" />
                <div className={styles.btnRow} style={{ marginTop: 8 }}>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => post({ action: 'retro', retro }, '复盘已保存')}>保存复盘</button>
                  {can(s, 'ops') && (
                    <button
                      className={styles.btn}
                      onClick={async () => {
                        const r = await api<{ added: number; removed: number; edited: number }>(`/api/v1/staff/prep/${params.eventId}`, { body: { action: 'applyRetro' } });
                        setMsg(r.ok ? { ok: true, text: `已同步进模板：新增 ${r.data.added} 项、删除 ${r.data.removed} 项、改字 ${r.data.edited} 项` } : { ok: false, text: r.message });
                        load();
                      }}
                    >
                      把这次的改动加进模板
                    </button>
                  )}
                </div>
                {p.retro_applied_at && <p className={styles.small}>上次同步：{fmt(p.retro_applied_at)}</p>}
              </div>
            </>
          )}
        </>
      )}
    </StaffGate>
  );
}

function AssignRow({ role, who, onSave }: { role: string; who?: { name: string; contact: string }; onSave: (name: string, contact: string) => void }) {
  const [name, setName] = useState(who?.name ?? '');
  const [contact, setContact] = useState(who?.contact ?? '');
  useEffect(() => {
    setName(who?.name ?? '');
    setContact(who?.contact ?? '');
  }, [who?.name, who?.contact]);
  return (
    <div style={{ marginBottom: 12 }}>
      <p className={styles.label} style={{ marginBottom: 4 }}>{role}</p>
      <div className={styles.inputRow}>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="姓名" aria-label={`${role} 姓名`} />
        <input className={styles.input} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="邮箱或手机" aria-label={`${role} 邮箱或手机`} />
        <button className={styles.btn} onClick={() => onSave(name.trim(), contact.trim())}>保存</button>
      </div>
    </div>
  );
}
