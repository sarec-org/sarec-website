'use client';
/**
 * 后台「工种与资质表」：每个工种一行（名称、分组、资质类型、发证机构、核验要点、官方查询页、开放开关），增删改、排序、分组；
 * 首页 7 个入口可换可排序，可指向一个工种或一组工种。改了立即生效，不用发版。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type G = { key: string; name: string; order: number };
type T = { key: string; name: string; group: string; licType: 'A' | 'B' | 'C'; issuer: string | null; licenseClass: string | null; lookupUrl: string | null; verifyPoints: string | null; open: boolean; noPost: boolean; noNotify: boolean; sort: number; verified: boolean; note: string | null };
type E = { label: string; target: { type: 'trade' | 'group'; key: string } };
type Res = { groups: G[]; trades: T[]; homeEntries: E[] };
const LIC: Record<string, string> = { A: 'A 加州承包商牌照', B: 'B 其他州执照', C: 'C 无州执照要求（营业登记 + 责任保险）' };
const BLANK: T = { key: '', name: '', group: '', licType: 'A', issuer: '', licenseClass: '', lookupUrl: '', verifyPoints: '', open: false, noPost: false, noNotify: false, sort: 999, verified: false, note: '' };
const newKey = (p: string) => `${p}${Date.now().toString(36)}`;
const TRADE = '/api/v1/workbench/jobs/trades';
const GROUP = '/api/v1/workbench/jobs/groups';

export default function StaffJobsTrades() {
  return (
    <StaffGate title="工种与资质表" role="ops" wide>
      {() => <Trades />}
    </StaffGate>
  );
}

function Trades() {
  const [d, setD] = useState<Res | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<T | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const load = useCallback(async () => {
    const r = await api<Res>('/api/v1/workbench/jobs/trades');
    if (r.ok) setD(r.data); else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  async function call(path: string, method: string, body: unknown, okText: string) {
    const r = await api(path, { method, body });
    if (!r.ok) { setMsg({ ok: false, text: r.message }); return false; }
    setMsg({ ok: true, text: okText });
    await load();
    return true;
  }
  if (!d) return msg ? <Msg m={msg} /> : <p className={styles.muted}>正在加载…</p>;
  const groups = [...d.groups].sort((a, b) => a.order - b.order);

  async function move(t: T, dir: -1 | 1) {
    // 整组重新编号（原来的顺序号可能一样），交换后逐个保存
    const same = d!.trades.filter((x) => x.group === t.group);
    const i = same.findIndex((x) => x.key === t.key);
    if (!same[i + dir]) return;
    [same[i], same[i + dir]] = [same[i + dir], same[i]];
    for (let k = 0; k < same.length; k++) if (same[k].sort !== (k + 1) * 10) await api(TRADE, { body: { ...same[k], sort: (k + 1) * 10 } });
    setMsg({ ok: true, text: `已把「${t.name}」${dir < 0 ? '上移' : '下移'}` });
    await load();
  }
  async function moveGroup(g: G, dir: -1 | 1) {
    const list = [...groups];
    const i = list.findIndex((x) => x.key === g.key);
    if (!list[i + dir]) return;
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    for (let k = 0; k < list.length; k++) if (list[k].order !== (k + 1) * 10) await api(GROUP, { body: { key: list[k].key, name: list[k].name, order: (k + 1) * 10 } });
    setMsg({ ok: true, text: `已把分组「${g.name}」${dir < 0 ? '上移' : '下移'}` });
    await load();
  }

  return (
    <>
      <p className={styles.small}>A、B 类显示“执照已核验 + 日期”；C 类显示“此类服务无需州执照”“已提供营业登记 / 责任保险”。没核实清楚的工种先别打开（open 关着的工种不出现在任何页面）。</p>
      <Msg m={msg} />
      <HomeEntries d={d} save={(entries) => call('/api/v1/workbench/jobs/home-entries', 'PUT', { entries }, '首页入口已保存')} />

      <h2 className={styles.h}>工种（按分组）</h2>
      <div className={styles.btnRow} style={{ marginBottom: '1rem' }}>
        <button className={styles.btn} onClick={() => { setIsNew(true); setEditing({ ...BLANK, group: groups[0]?.key ?? '' }); }}>新加一个工种</button>
      </div>
      {editing && (
        <TradeEditor
          t={editing}
          isNew={isNew}
          groups={groups}
          onCancel={() => setEditing(null)}
          onSave={async (t) => {
            const okd = await call(TRADE, 'POST', isNew ? { ...t, key: newKey('t') } : t, isNew ? `已新加「${t.name}」` : `已保存「${t.name}」`);
            if (okd) setEditing(null);
          }}
        />
      )}
      {groups.map((g, gi) => {
        const ts = d.trades.filter((t) => t.group === g.key);
        return (
          <section key={g.key} className={styles.card}>
            <div className={styles.row}>
              <b>{g.name}</b>
              <span className={styles.btnRow} style={{ flex: '0 0 auto' }}>
                <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} disabled={gi === 0} onClick={() => moveGroup(g, -1)}>上移</button>
                <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} disabled={gi === groups.length - 1} onClick={() => moveGroup(g, 1)}>下移</button>
                <GroupRename g={g} save={(name) => call(GROUP, 'POST', { key: g.key, name, order: g.order }, '分组已改名')} />
              </span>
            </div>
            {ts.length === 0 && <p className={styles.muted}>这一组还没有工种。</p>}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <tbody>
                  {ts.map((t, i) => (
                    <tr key={t.key}>
                      <td style={{ whiteSpace: 'normal', minWidth: 220 }}><b>{t.name}</b><div className={styles.small}>{LIC[t.licType]}{t.issuer ? ` · ${t.issuer}` : ''}{t.licenseClass ? ` · ${t.licenseClass}` : ''}</div>{t.verifyPoints && <div className={styles.small}>核验要点：{t.verifyPoints.split('\n').join('；')}</div>}{t.note && <div className={styles.small}>备注：{t.note}</div>}</td>
                      <td>
                        <span className={`${styles.badge} ${t.open ? styles.badgeGreen : styles.badgeMuted}`}>{t.open ? '已开放' : '没开放'}</span>
                        {t.noPost && <span className={`${styles.badge} ${styles.badgeMuted}`}>不接受发活儿</span>}
                        {t.noNotify && <span className={`${styles.badge} ${styles.badgeMuted}`}>不发通知</span>}
                        {!t.verified && <span className={`${styles.badge} ${styles.badgeRed}`}>资质还没逐行核实</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} disabled={i === 0} onClick={() => move(t, -1)}>↑</button>{' '}
                        <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} disabled={i === ts.length - 1} onClick={() => move(t, 1)}>↓</button>{' '}
                        <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => call(TRADE, 'POST', { ...t, open: !t.open }, `「${t.name}」已${t.open ? '关闭' : '开放'}`)}>{t.open ? '关闭' : '开放'}</button>{' '}
                        <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => { setIsNew(false); setEditing(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>改</button>{' '}
                        <DeleteTrade t={t} del={() => call(`${TRADE}/${encodeURIComponent(t.key)}`, 'DELETE', undefined, `已删「${t.name}」`)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      <div className={styles.inputRow}>
        <input className={styles.input} placeholder="新分组名，例如：搬家与清运" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />
        <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={!newGroup.trim()} onClick={async () => { if (await call(GROUP, 'POST', { key: newKey('g'), name: newGroup.trim(), order: (groups.length + 1) * 10 }, `已加分组「${newGroup.trim()}」`)) setNewGroup(''); }}>加分组</button>
      </div>
      <p className={styles.small}>共 {groups.length} 个分组、{d.trades.length} 个工种，开放 {d.trades.filter((t) => t.open).length} 个。分组没法删（里面的工种挪走后，分组空着不会显示）。</p>
    </>
  );
}

function GroupRename({ g, save }: { g: G; save: (name: string) => Promise<boolean> }) {
  const [on, setOn] = useState(false);
  const [v, setV] = useState(g.name);
  if (!on) return <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setOn(true)}>改名</button>;
  return (
    <>
      <input className={styles.input} style={{ minHeight: 44, maxWidth: 180 }} value={v} onChange={(e) => setV(e.target.value)} />
      <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!v.trim()} onClick={async () => { if (await save(v.trim())) setOn(false); }}>存</button>
    </>
  );
}

function DeleteTrade({ t, del }: { t: T; del: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => setAsk(true)}>删</button>;
  return (
    <>
      <span className={styles.small}>删掉「{t.name}」？已登记这个工种的人会少一项。</span>{' '}
      <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => { setAsk(false); del(); }}>确认删</button>{' '}
      <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} onClick={() => setAsk(false)}>不删</button>
    </>
  );
}

function TradeEditor({ t, isNew, groups, onSave, onCancel }: { t: T; isNew: boolean; groups: G[]; onSave: (t: T) => void; onCancel: () => void }) {
  const [v, setV] = useState<T>(t);
  const set = (p: Partial<T>) => setV((x) => ({ ...x, ...p }));
  return (
    <div className={styles.card} style={{ borderLeft: '3px solid var(--gold)' }}>
      <p className={styles.cardTitle}>{isNew ? '新加工种' : `改「${t.name}」`}</p>
      <div className={styles.field}><label className={styles.label}>名称</label><input className={styles.input} value={v.name} onChange={(e) => set({ name: e.target.value })} /></div>
      <div className={styles.field}><span className={styles.label}>分组</span>
        <div className={styles.chips}>{groups.map((g) => <button key={g.key} type="button" className={`${styles.chip} ${v.group === g.key ? styles.chipOn : ''}`} onClick={() => set({ group: g.key })}>{g.name}</button>)}</div>
      </div>
      <div className={styles.field}><span className={styles.label}>资质类型</span>
        <div className={styles.chips}>{(['A', 'B', 'C'] as const).map((k) => <button key={k} type="button" className={`${styles.chip} ${v.licType === k ? styles.chipOn : ''}`} onClick={() => set({ licType: k })}>{LIC[k]}</button>)}</div>
      </div>
      <div className={styles.field}><label className={styles.label}>发证机构</label><input className={styles.input} placeholder="例如：加州承包商执照局（CSLB）" value={v.issuer ?? ''} onChange={(e) => set({ issuer: e.target.value })} /></div>
      <div className={styles.field}><label className={styles.label}>牌照类别</label><input className={styles.input} placeholder="例如：C-36 管道" value={v.licenseClass ?? ''} onChange={(e) => set({ licenseClass: e.target.value })} /></div>
      <div className={styles.field}><label className={styles.label}>核验要点（一行一条，会变成核验清单）</label><textarea className={styles.textarea} value={v.verifyPoints ?? ''} onChange={(e) => set({ verifyPoints: e.target.value })} /></div>
      <div className={styles.field}><label className={styles.label}>官方查询页网址（牌照号的位置写 {'{licNum}'}）</label><input className={styles.input} placeholder="https://" value={v.lookupUrl ?? ''} onChange={(e) => set({ lookupUrl: e.target.value })} /></div>
      <div className={styles.field}><label className={styles.label}>备注</label><input className={styles.input} value={v.note ?? ''} onChange={(e) => set({ note: e.target.value })} /></div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 40 }}><input type="checkbox" checked={v.verified} onChange={(e) => set({ verified: e.target.checked })} />已对照发证机构官网核实过这一行</label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 40 }}><input type="checkbox" checked={v.open} onChange={(e) => set({ open: e.target.checked })} />开放（核实清楚了才打开）</label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 40 }}><input type="checkbox" checked={!!v.noPost} onChange={(e) => set({ noPost: e.target.checked })} />不接受针对这个工种发活儿（例如地产律师：只展示、可联系）</label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 40 }}><input type="checkbox" checked={!!v.noNotify} onChange={(e) => set({ noNotify: e.target.checked })} />不给这个工种发活儿通知</label>
      <div className={styles.btnRow}>
        <button className={styles.btn} disabled={!v.name.trim() || !v.group} onClick={() => onSave({ ...v, name: v.name.trim() })}>保存</button>
        <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

/** 首页 7 个入口：可换（指向工种或分组）、可排序 */
function HomeEntries({ d, save }: { d: Res; save: (e: E[]) => Promise<boolean> }) {
  const [list, setList] = useState<E[]>(d.homeEntries);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setList(d.homeEntries); setDirty(false); }, [d.homeEntries]);
  const upd = (i: number, e: E) => { setList(list.map((x, j) => (j === i ? e : x))); setDirty(true); };
  const swap = (i: number, k: number) => { const n = [...list]; [n[i], n[k]] = [n[k], n[i]]; setList(n); setDirty(true); };
  const options = [
    ...[...d.groups].sort((a, b) => a.order - b.order).map((g) => ({ v: `group:${g.key}`, l: `【一组】${g.name}` })),
    ...d.trades.filter((t) => t.open).map((t) => ({ v: `trade:${t.key}`, l: t.name }))
  ];
  return (
    <section className={styles.card}>
      <p className={styles.cardTitle}>首页 7 个入口</p>
      <p className={styles.small}>第 8 个固定是“全部工种和服务”。入口可以指向一个工种，也可以指向一组工种（点进去先出这一组的方块）。还没有核验通过的人的工种，首页不显示。</p>
      {list.map((e, i) => (
        <div key={i} className={styles.inputRow} style={{ marginBottom: '0.5rem' }}>
          <span style={{ alignSelf: 'center', minWidth: 24 }}>{i + 1}</span>
          <input className={styles.input} style={{ flex: '1 1 120px' }} value={e.label} onChange={(ev) => upd(i, { ...e, label: ev.target.value })} aria-label="入口名字" />
          <select className={styles.select} value={`${e.target.type}:${e.target.key}`} onChange={(ev) => { const [type, ...k] = ev.target.value.split(':'); upd(i, { ...e, target: { type: type as 'trade' | 'group', key: k.join(':') } }); }}>
            {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} disabled={i === 0} onClick={() => swap(i, i - 1)}>↑</button>
          <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`} disabled={i === list.length - 1} onClick={() => swap(i, i + 1)}>↓</button>
        </div>
      ))}
      <div className={styles.btnRow}>
        <button className={styles.btn} disabled={!dirty || list.length !== 7 || list.some((x) => !x.label.trim())} onClick={() => save(list)}>保存首页入口</button>
        {dirty && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => { setList(d.homeEntries); setDirty(false); }}>不改了</button>}
      </div>
    </section>
  );
}
