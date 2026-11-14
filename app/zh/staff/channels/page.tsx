'use client';
/**
 * 渠道码（1.3 F）：给每个合作商家、合作机构、副会长单位生成专属小程序码，按渠道看带来的访问 → 报名 → 到场 → 入会 → 有效咨询。
 * 口径与“推荐排行”“功能排行”相同。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';
import { saveImage, savedText } from '@/components/crm/staff/SaveImage';

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
  // 1.4.0（改动单 D7）：停用 / 启用给结果提示，失败说原因
  async function toggle(c: Ch) {
    const r = await api('/api/v1/staff/channels', { method: 'PATCH', body: { id: c.id, active: !c.active } });
    setMsg(r.ok ? { ok: true, text: c.active ? `已停用渠道“${c.name}”：这个码扫进来不再记到这个渠道（以前的数据保留）` : `已启用渠道“${c.name}”` } : { ok: false, text: r.message });
    load();
  }
  // 1.4.0（1.3.5 第 11 条）：手机上直接显示图 + 存相册，电脑照常下载
  async function download(c: Ch) {
    try {
      const how = await saveImage(`/api/v1/staff/channels/${c.code}${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, `渠道码-${c.name}${slug ? '-' + slug : ''}.png`);
      setMsg({ ok: true, text: savedText(how, `“${c.name}”的渠道码`) });
    } catch {
      setMsg({ ok: false, text: '小程序码这会儿生成不了，请过 1 分钟再点一次' });
    }
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
          {/* 1.4.0：手机上表格要横滑才看得到按钮，改成一条一张卡片 */}
          {rows?.map((c) => (
            <div key={c.id} className={styles.card} style={{ opacity: c.active ? 1 : 0.6 }}>
              <p className={styles.cardTitle}>{c.name}{!c.active && <span className={`${styles.badge} ${styles.badgeMuted}`}>已停用</span>}</p>
              <p className={styles.small} style={{ margin: '0 0 0.4rem' }}>{c.kindLabel} · {c.code}</p>
              <p style={{ margin: '0 0 0.6rem' }}>
                访问 <b>{c.stats.visits}</b> · 报名 <b>{c.stats.registered}</b> · 到场 <b>{c.stats.arrived}</b> · 入会 <b>{c.stats.joined}</b> · 有效咨询 <b>{c.stats.inquiries}</b> · 首次来源 <b>{c.stats.firstTouch}</b>
              </p>
              <div className={styles.btnRow}>
                <button className={styles.btn} onClick={() => download(c)}>下载 / 存码</button>
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => toggle(c)}>{c.active ? '停用' : '启用'}</button>
              </div>
            </div>
          ))}
          {rows && !rows.length && <p className={styles.muted}>还没有渠道。先在上面建一个。</p>}
        </>
      )}
    </StaffGate>
  );
}
