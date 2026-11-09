'use client';
/** 1.3.1 G3：首页轮播——系统自动排版，助理只处理例外：置顶、隐藏、改文案 / 换图、手动加一张。所有手动设置必须有截止时间。 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Slide = { key: string; kind: string; eyebrow: string; title: string; meta: string; image: string | null; button: { text: string } | null; pinned?: boolean };
type Ov = { id: string; action: string; target: string | null; title: string | null; expires_at: string; created_by: string; audience: string };
const ACT: Record<string, string> = { pin: '置顶', hide: '隐藏', edit: '改文案 / 换图', add: '手动加一张' };
const WHO: Record<string, string> = { new: '新人', registered: '已报名', member: '会员' };
const inDays = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 16);

export default function HomeSlides() {
  const [prev, setPrev] = useState<Record<string, Slide[]> | null>(null);
  const [ovs, setOvs] = useState<Ov[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ action: 'add', target: '', title: '', eyebrow: '', meta: '', imageUrl: '', buttonText: '', link: '', audience: 'all', expiresAt: inDays(7) });
  const load = useCallback(async () => {
    const r = await api<{ overrides: Ov[]; preview: Record<string, Slide[]> }>('/api/v1/staff/home-slides');
    if (r.ok) { setOvs(r.data.overrides); setPrev(r.data.preview); } else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    const r = await api('/api/v1/staff/home-slides', { body: { ...form, expiresAt: new Date(form.expiresAt).toISOString() } });
    setMsg(r.ok ? { ok: true, text: '已保存，首页马上生效（到截止时间自动失效）' } : { ok: false, text: r.message });
    if (r.ok) load();
  };
  const remove = async (id: string) => {
    const r = await api(`/api/v1/staff/home-slides?id=${id}`, { method: 'DELETE' });
    setMsg(r.ok ? { ok: true, text: '已撤掉' } : { ok: false, text: r.message });
    if (r.ok) load();
  };
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const allSlides = prev ? Array.from(new Map(Object.values(prev).flat().map((s) => [s.key, s])).values()) : [];
  return (
    <StaffGate title="首页轮播" role="ops" wide>
      {() => (
        <>
          <p className={styles.small}>轮播内容系统自动取：活动封面和时间、已发布的照片、入会 / 会员服务、公告。最多 5 张，没有就不凑。你只需要处理例外，所有手动设置必须有截止时间；活动取消、结束等状态优先于手动设置。轮播上不能出现金额、付款字样和“已报 N 人”。</p>
          <Msg m={msg} />
          <h2 className={styles.h}>现在三种人分别看到什么</h2>
          {prev && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.entries(prev).map(([who, list]) => (
                <div key={who} className={styles.card} style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <p className={styles.cardTitle}>{WHO[who] ?? who}</p>
                  {list.map((s, i) => (
                    <div key={s.key} className={styles.small} style={{ padding: '4px 0', borderTop: i ? '1px solid rgba(0,0,0,0.06)' : undefined }}>
                      {i + 1}. {s.pinned ? '📌 ' : ''}<b>{s.title}</b> · {s.eyebrow}{s.button ? ` · 按钮“${s.button.text}”` : ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <h2 className={styles.h}>加一条手动设置</h2>
          <div className={styles.card}>
            <label className={styles.label}>做什么</label>
            <select className={styles.select} value={form.action} onChange={(e) => set('action', e.target.value)}>
              {Object.entries(ACT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {form.action !== 'add' && (
              <>
                <label className={styles.label}>哪一张</label>
                <select className={styles.select} value={form.target} onChange={(e) => set('target', e.target.value)}>
                  <option value="">请选择</option>
                  {allSlides.map((s) => <option key={s.key} value={s.key}>{s.title}（{s.eyebrow}）</option>)}
                </select>
              </>
            )}
            {(form.action === 'add' || form.action === 'edit') && (
              <>
                <label className={styles.label}>标题{form.action === 'edit' ? '（不填 = 不改）' : ''}</label>
                <input className={styles.input} value={form.title} maxLength={40} onChange={(e) => set('title', e.target.value)} />
                <label className={styles.label}>小字（选填）</label>
                <input className={styles.input} value={form.eyebrow} maxLength={30} onChange={(e) => set('eyebrow', e.target.value)} />
                <label className={styles.label}>说明（选填）</label>
                <input className={styles.input} value={form.meta} maxLength={60} onChange={(e) => set('meta', e.target.value)} />
                <label className={styles.label}>图片地址（选填，换图用）</label>
                <input className={styles.input} value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
                <label className={styles.label}>按钮文字（选填，最多 8 个字）</label>
                <input className={styles.input} value={form.buttonText} maxLength={8} onChange={(e) => set('buttonText', e.target.value)} />
                {form.action === 'add' && (
                  <>
                    <label className={styles.label}>点进去打开哪个小程序页面（选填，例如 /pages/intro/intro）</label>
                    <input className={styles.input} value={form.link} onChange={(e) => set('link', e.target.value)} />
                  </>
                )}
              </>
            )}
            <label className={styles.label}>给谁看</label>
            <select className={styles.select} value={form.audience} onChange={(e) => set('audience', e.target.value)}>
              <option value="all">所有人</option><option value="new">新人</option><option value="registered">注册用户 / 已报名</option><option value="member">会员</option>
            </select>
            <label className={styles.label}>截止时间（必填，到点自动失效）</label>
            <input className={styles.input} type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
            <button className={styles.btn} onClick={save}>保存</button>
          </div>
          <h2 className={styles.h}>生效中的手动设置</h2>
          {!ovs.length && <p className={styles.muted}>没有，首页全按系统自动排。</p>}
          {ovs.map((o) => (
            <div key={o.id} className={styles.card}>
              <b>{ACT[o.action]}</b> {o.title ?? o.target ?? ''} · 给{o.audience === 'all' ? '所有人' : WHO[o.audience] ?? o.audience} · 到 {fmtDateTime(o.expires_at)} · {o.created_by.replace(/^staff:/, '')}
              <div className={styles.btnRow}><button className={styles.btnQuiet} onClick={() => remove(o.id)}>撤掉</button></div>
            </div>
          ))}
        </>
      )}
    </StaffGate>
  );
}
