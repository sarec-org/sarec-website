'use client';
/**
 * 后台「找工人接活开关」：两个栏目开关 + 指令 9 · D28「接活儿收费方式」（全部免费 / 免费额度 / 必须是会员）、免费联系次数、非会员免费发活儿条数。
 * 改动前确认；立即生效；每项改动记谁、何时、改前改后（页面下方列出最近的操作记录）。手机工作台调同一个接口。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type FeeMode = 'all_free' | 'free_quota' | 'members_only';
type Sw = { find: boolean; work: boolean; requirePaid: boolean; feeMode: FeeMode; freeContacts: number; freePosts: number | null };
type Change = { updatedBy: string | null; updatedAt: string } | null;
type LogRow = { key: string; name: string; actor: string; at: string; before: unknown; after: unknown };
type Detail = { switches: Sw; changes: Record<string, Change>; feeModes: { key: FeeMode; label: string; hint: string }[]; log: LogRow[] };

const ITEMS: { k: 'find' | 'work'; name: string; on: string; off: string }[] = [
  { k: 'find', name: '「找工人／施工队」栏目', on: '打开后，首页和网站出现「找工人／施工队」；只显示已经有核验通过的人的工种。', off: '关掉后，普通人看不到这个栏目，直接打开页面看到"这个功能还没开放"。工作人员照常能看。' },
  { k: 'work', name: '「我要接活儿」栏目', on: '打开后，首页和网站出现「我要接活儿」：登记接活儿、看全部活儿。', off: '关掉后，普通人看不到这个栏目。工作人员照常能看。' }
];
const MODE_LABEL: Record<FeeMode, string> = { all_free: '全部免费', free_quota: '免费额度', members_only: '必须是会员' };

const FIELD: Record<string, string> = { find: '找工人', work: '接活儿', requirePaid: '要求缴费会员', feeMode: '收费方式', freeContacts: '免费联系次数', freePosts: '非会员免费发活儿' };
const FIELD_KEY: Record<string, string> = { feeMode: 'jobs_work_fee_mode', freePosts: 'jobs_free_posts' };
function show(key: string, v: unknown): string {
  // J9-4：老记录（指令 6 一次改三个开关）存的是对象 → 逐项写出来
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${FIELD[k] ?? k} ${show(FIELD_KEY[k] ?? k, x)}`).join('、') || '—';
  }
  if (key === 'jobs_work_fee_mode' && typeof v === 'string') return MODE_LABEL[v as FeeMode] ?? v;
  if (key === 'jobs_free_posts' && (v === null || v === undefined)) return '不限';
  if (typeof v === 'boolean') return v ? '开' : '关';
  if (v === null || v === undefined) return '—';
  return String(v);
}

export default function StaffJobsSwitches() {
  return (
    <StaffGate title="找工人接活开关" role="ops">
      {(me) => <Switches admin={me.roles.includes('admin')} />}
    </StaffGate>
  );
}

function Switches({ admin }: { admin: boolean }) {
  const [d, setD] = useState<Detail | null>(null);
  const [ask, setAsk] = useState<{ patch: Record<string, unknown>; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mode, setMode] = useState<FeeMode>('free_quota');
  const [contacts, setContacts] = useState('2');
  const [posts, setPosts] = useState('');
  const load = useCallback(async () => {
    const r = await api<Detail>('/api/v1/workbench/jobs/switches');
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setD(r.data);
    setMode(r.data.switches.feeMode);
    setContacts(String(r.data.switches.freeContacts));
    setPosts(r.data.switches.freePosts == null ? '' : String(r.data.switches.freePosts));
  }, []);
  useEffect(() => { load(); }, [load]);
  async function save() {
    if (!ask) return;
    setBusy(true);
    const r = await api<Detail>('/api/v1/workbench/jobs/switches', { method: 'PATCH', body: ask.patch });
    setBusy(false);
    const text = ask.text;
    setAsk(null);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: `已保存：${text}。马上生效。` });
    load();
  }
  if (!d) return msg ? <Msg m={msg} /> : <p className={styles.muted}>正在加载…</p>;
  const sw = d.switches;
  const changed = (k: string) => d.changes[k];
  const feeDirty = mode !== sw.feeMode || contacts.trim() !== String(sw.freeContacts) || posts.trim() !== (sw.freePosts == null ? '' : String(sw.freePosts));
  const feeText = `接活儿收费方式「${MODE_LABEL[mode]}」${mode === 'free_quota' ? `，免费联系 ${contacts.trim() || '0'} 次` : ''}；非会员免费发活儿${posts.trim() ? ` ${posts.trim()} 次` : '不限'}`;
  const confirmBox = (
    ask && (
      <div className={styles.notice}>
        确定要改成：{ask.text}吗？改了马上生效。
        <div className={styles.btnRow} style={{ marginTop: '0.5rem' }}>
          <button className={styles.btn} disabled={busy} onClick={save}>{busy ? '正在保存…' : '确定'}</button>
          <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setAsk(null)}>不改了</button>
        </div>
      </div>
    )
  );
  return (
    <>
      <p className={styles.small}>网站后台和手机工作台改的是同一组设置。每次改动都要先确认，马上生效，并记下谁、什么时候、改前改后。</p>
      <Msg m={msg} />
      {ITEMS.map((it) => (
        <div key={it.k} className={styles.card}>
          <div className={styles.row}>
            <span><b>{it.name}</b></span>
            <span className={`${styles.badge} ${sw[it.k] ? styles.badgeGreen : styles.badgeMuted}`}>{sw[it.k] ? '开着' : '关着'}</span>
          </div>
          <p className={styles.small}>{sw[it.k] ? it.on : it.off}</p>
          <p className={styles.small}>{changed(it.k) ? `上次改动：${changed(it.k)!.updatedBy?.replace(/^staff:/, '') ?? '—'}，${fmtDateTime(changed(it.k)!.updatedAt)}` : '还没人改过（默认值）'}</p>
          {ask?.patch[it.k] !== undefined ? confirmBox : (
            <button className={`${styles.btn} ${sw[it.k] ? styles.btnQuiet : ''}`} disabled={!admin} onClick={() => setAsk({ patch: { [it.k]: !sw[it.k] }, text: `${sw[it.k] ? '关掉' : '打开'}${it.name}` })}>
              {!admin ? '只有管理员能改' : sw[it.k] ? '关掉' : '打开'}
            </button>
          )}
        </div>
      ))}

      <div className={styles.card}>
        <div className={styles.row}>
          <span><b>接活儿收费方式</b></span>
          <span className={`${styles.badge} ${styles.badgeGreen}`}>现在：{MODE_LABEL[sw.feeMode]}</span>
        </div>
        <p className={styles.small}>只管施工队、持牌师傅、设计与专业服务（工人一直免费）。需要执照的工种照旧要核验通过，不受这里影响。商会会员一律不限。</p>
        <div style={{ display: 'grid', gap: '0.5rem', margin: '0.6rem 0' }}>
          {d.feeModes.map((m) => (
            <label key={m.key} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', minHeight: 44 }}>
              <input type="radio" name="feeMode" checked={mode === m.key} disabled={!admin} onChange={() => setMode(m.key)} style={{ marginTop: '0.3rem' }} />
              <span><b>{m.label}</b>{m.key === 'free_quota' ? '（默认）' : ''}<br /><span className={styles.small}>{m.hint}</span></span>
            </label>
          ))}
        </div>
        {mode === 'free_quota' && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="sw-fc">免费联系次数（非会员免费看几位发布人的电话；同一条活儿重复看不算）</label>
            <input id="sw-fc" className={styles.input} inputMode="numeric" value={contacts} disabled={!admin} onChange={(e) => setContacts(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="sw-fp">非会员免费发活儿条数（留空 = 不限；会员一律不限）</label>
          <input id="sw-fp" className={styles.input} inputMode="numeric" placeholder="不限" value={posts} disabled={!admin} onChange={(e) => setPosts(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          <p className={styles.small} style={{ margin: 0 }}>按发布次数算：一次选了几个工种拆成几条，也只算一次。</p>
        </div>
        <p className={styles.small}>
          {changed('feeMode') ? `收费方式上次改动：${changed('feeMode')!.updatedBy?.replace(/^staff:/, '') ?? '—'}，${fmtDateTime(changed('feeMode')!.updatedAt)}` : '收费方式还没人改过（默认值）'}
        </p>
        {ask && ask.patch.feeMode !== undefined ? confirmBox : (
          <button className={styles.btn} disabled={!admin || !feeDirty} onClick={() => {
            if (mode === 'free_quota' && contacts.trim() === '') return setMsg({ ok: false, text: '请填免费联系次数（可以填 0）' });
            setAsk({ patch: { feeMode: mode, freeContacts: mode === 'free_quota' ? Number(contacts) : sw.freeContacts, freePosts: posts.trim() ? Number(posts) : null }, text: feeText });
          }}>
            {!admin ? '只有管理员能改' : feeDirty ? '保存收费设置' : '没有改动'}
          </button>
        )}
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>操作记录（最近 30 条）</p>
        {d.log.length === 0 ? <p className={styles.small}>还没有改动记录。</p> : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {d.log.map((r, i) => (
              <li key={i} className={styles.small}>
                {fmtDateTime(r.at)} · {r.actor.replace(/^staff:/, '')} · {r.name}：{show(r.key, r.before)} → {show(r.key, r.after)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className={styles.small}>只有管理员能改；运营能看。</p>
    </>
  );
}
