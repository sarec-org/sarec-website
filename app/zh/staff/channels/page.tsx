'use client';
/**
 * 渠道码（1.3 F）：给每个合作商家、合作机构、副会长单位生成专属小程序码，按渠道看带来的访问 → 报名 → 到场 → 入会 → 有效咨询。
 * 口径与“推荐排行”“功能排行”相同。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type F = { visits: number; registered: number; arrived: number; joined: number; inquiries: number; firstTouch: number };
type Ch = { id: number; code: string; name: string; kind: string; kindLabel: string; note: string | null; active: boolean; stats: F };
type Ev = { id: string; slug: string; title: string };
const KINDS: [string, string][] = [['merchant', '合作商家'], ['org', '合作机构'], ['vp_unit', '副会长单位'], ['partner', '战略伙伴'], ['other', '其他']];

export default function StaffChannels() {
  const [rows, setRows] = useState<Ch[] | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [win, setWin] = useState<string>('30');
  const [slug, setSlug] = useState('');
  const [form, setForm] = useState({ name: '', kind: 'merchant', note: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const q = win.startsWith('ev:') ? `eventId=${win.slice(3)}` : `days=${win}`;
    const r = await api<{ channels: Ch[] }>(`/api/v1/staff/channels?${q}`);
    if (r.ok) setRows(r.data.channels);
    else setMsg({ ok: false, text: r.message });
  }, [win]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api<{ events: Ev[] }>('/api/v1/staff/events').then((r) => r.ok && setEvents(r.data.events ?? []));
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await api('/api/v1/staff/channels', { body: form });
    setMsg(r.ok ? { ok: true, text: `已建好渠道“${form.name}”` } : { ok: false, text: r.message });
    if (r.ok) setForm({ name: '', kind: 'merchant', note: '' });
    load();
  }
  async function toggle(c: Ch) {
    await api('/api/v1/staff/channels', { method: 'PATCH', body: { id: c.id, active: !c.active } });
    load();
  }
  async function download(c: Ch) {
    const res = await fetch(`/api/v1/staff/channels/${c.code}${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, { credentials: 'same-origin' }).catch(() => null);
    if (!res || !res.ok) return setMsg({ ok: false, text: '小程序码这会儿生成不了，请过 1 分钟再点一次' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = `渠道码-${c.name}${slug ? '-' + slug : ''}.png`;
    a.click();
  }
  return (
    <StaffGate title="渠道码" role="ops">
      {() => (
        <>
          <div className={styles.notice}>每个合作商家 / 机构 / 副会长单位一个专属小程序码。扫码进来的人报名、到场、入会、咨询都会记到这个渠道。口径和“推荐排行”“功能排行”相同。</div>
          <Msg m={msg} />
          <form className={styles.card} onSubmit={create}>
            <p className={styles.cardTitle}>新建渠道</p>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ch-name">名称</label>
                <input id="ch-name" className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：XX 地产" />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="ch-kind">类型</label>
                <select id="ch-kind" className={styles.select} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  {KINDS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ch-note">备注（选填）</label>
              <input id="ch-note" className={styles.input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <button className={styles.btn} disabled={!form.name.trim()}>建渠道</button>
          </form>
          <div className={styles.inputRow} style={{ margin: '12px 0' }}>
            <select className={styles.select} value={win} onChange={(e) => setWin(e.target.value)} aria-label="时间范围">
              <option value="7">最近 7 天</option>
              <option value="30">最近 30 天</option>
              <option value="0">全部</option>
              {events.map((e) => <option key={e.id} value={`ev:${e.id}`}>活动：{e.title}</option>)}
            </select>
            <select className={styles.select} value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="码进哪个页面">
              <option value="">下载的码进：小程序首页</option>
              {events.map((e) => <option key={e.slug} value={e.slug}>下载的码进：{e.title}</option>)}
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead><tr><th>渠道</th><th>访问</th><th>报名</th><th>到场</th><th>入会</th><th>有效咨询</th><th>首次来源</th><th></th></tr></thead>
              <tbody>
                {rows?.map((c) => (
                  <tr key={c.id} style={{ opacity: c.active ? 1 : 0.5 }}>
                    <td>{c.name}<br /><span className={styles.small}>{c.kindLabel} · {c.code}</span></td>
                    <td>{c.stats.visits}</td><td>{c.stats.registered}</td><td>{c.stats.arrived}</td><td>{c.stats.joined}</td><td>{c.stats.inquiries}</td><td>{c.stats.firstTouch}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className={`${styles.btn} ${styles.btnSmall ?? ''}`} onClick={() => download(c)}>下载码</button>{' '}
                      <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => toggle(c)}>{c.active ? '停用' : '启用'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows && !rows.length && <p className={styles.muted}>还没有渠道。先在上面建一个。</p>}
        </>
      )}
    </StaffGate>
  );
}
