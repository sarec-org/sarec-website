'use client';
/**
 * 后台「城市」：找工人·接活儿用的城市表（按地区分组）。增删改、排序、停用；改了立即生效，不用发版。
 * 发活儿、登记接活、所有城市筛选都用这一张表。有人用过的城市“删除”= 停用（不再出现在选项里，原来的记录照样显示）。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type C = { key: string; name: string; region: string; regionSort: number; sort: number; enabled: boolean; pros: number; posts: number };
type R = { region: string; regionSort: number; items: C[] };
type Res = { regions: R[] };
const BASE = '/api/v1/workbench/jobs/cities';
const small = `${styles.btn} ${styles.btnQuiet} ${styles.btnSmall}`;

export default function StaffJobsCities() {
  return (
    <StaffGate title="找工人接活儿 · 城市" role="ops" wide>
      {() => <Cities />}
    </StaffGate>
  );
}

function Cities() {
  const [d, setD] = useState<Res | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const load = useCallback(async () => {
    const r = await api<Res>(BASE);
    if (r.ok) setD(r.data); else setMsg({ ok: false, text: r.message });
  }, []);
  useEffect(() => { load(); }, [load]);
  async function call(path: string, method: string, body: unknown, okText?: string) {
    const r = await api<Record<string, unknown>>(path, { method, body });
    if (!r.ok) { setMsg({ ok: false, text: r.message }); return false; }
    setMsg({ ok: true, text: okText ?? String(r.data.message ?? '已保存') });
    await load();
    return true;
  }
  if (!d) return msg ? <Msg m={msg} /> : <p className={styles.muted}>正在加载…</p>;
  const regions = d.regions;
  const order = (rs: R[]) => ({ regions: rs.map((g) => ({ region: g.region, keys: g.items.map((c) => c.key) })) });

  function moveRegion(i: number, dir: -1 | 1) {
    const rs = [...regions];
    if (!rs[i + dir]) return;
    [rs[i], rs[i + dir]] = [rs[i + dir], rs[i]];
    call(`${BASE}/order`, 'PUT', order(rs), `已把「${regions[i].region}」${dir < 0 ? '上移' : '下移'}`);
  }
  function moveCity(gi: number, ci: number, dir: -1 | 1) {
    const rs = regions.map((g) => ({ ...g, items: [...g.items] }));
    const items = rs[gi].items;
    if (!items[ci + dir]) return;
    [items[ci], items[ci + dir]] = [items[ci + dir], items[ci]];
    call(`${BASE}/order`, 'PUT', order(rs), `已把「${regions[gi].items[ci].name}」${dir < 0 ? '上移' : '下移'}`);
  }
  const target = region === '__new' ? newRegion.trim() : region || regions[0]?.region || '';

  return (
    <>
      <p className={styles.small}>发活儿、登记接活、看活儿和找人的城市筛选都用这张表。地区的顺序就是页面上的顺序（前两个地区直接摆出来，其余收起）。有人登记过或发过活儿的城市点“删除”只会停用，原来的记录照样显示。</p>
      <Msg m={msg} />

      <h2 className={styles.h}>加一个城市</h2>
      <div className={styles.inputRow}>
        <input className={styles.input} placeholder="城市名，例如：塔斯汀" value={name} onChange={(e) => setName(e.target.value)} />
        <select className={styles.select} value={region || regions[0]?.region || ''} onChange={(e) => setRegion(e.target.value)}>
          {regions.map((g) => <option key={g.region} value={g.region}>{g.region}</option>)}
          <option value="__new">新地区…</option>
        </select>
        {region === '__new' && <input className={styles.input} placeholder="新地区名" value={newRegion} onChange={(e) => setNewRegion(e.target.value)} />}
        <button className={styles.btn} disabled={!name.trim() || !target} onClick={async () => {
          if (await call(BASE, 'POST', { name: name.trim(), region: target }, `已加「${name.trim()}」到「${target}」`)) { setName(''); setNewRegion(''); setRegion(''); }
        }}>加上</button>
      </div>

      {regions.map((g, gi) => (
        <section key={g.region} className={styles.card}>
          <div className={styles.row}>
            <b>{g.region}</b>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className={small} disabled={gi === 0} onClick={() => moveRegion(gi, -1)}>地区上移</button>
              <button className={small} disabled={gi === regions.length - 1} onClick={() => moveRegion(gi, 1)}>地区下移</button>
            </span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <tbody>
                {g.items.map((c, ci) => (
                  <tr key={c.key}>
                    <td style={{ whiteSpace: 'normal', minWidth: 140 }}>
                      <b style={c.enabled ? undefined : { opacity: 0.55 }}>{c.name}</b>
                      <div className={styles.small}>登记的人 {c.pros} · 活儿 {c.posts}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`${styles.badge} ${c.enabled ? styles.badgeGreen : styles.badgeMuted}`}>{c.enabled ? '在用' : '已停用'}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className={small} disabled={ci === 0} onClick={() => moveCity(gi, ci, -1)}>↑</button>{' '}
                      <button className={small} disabled={ci === g.items.length - 1} onClick={() => moveCity(gi, ci, 1)}>↓</button>{' '}
                      <Rename c={c} regions={regions.map((x) => x.region)} save={(n, rg) => call(BASE, 'POST', { key: c.key, name: n, region: rg }, `已保存「${n}」`)} />{' '}
                      <button className={small} onClick={() => call(BASE, 'POST', { key: c.key, name: c.name, region: c.region, enabled: !c.enabled }, `「${c.name}」已${c.enabled ? '停用' : '恢复'}`)}>{c.enabled ? '停用' : '恢复'}</button>{' '}
                      <Delete c={c} del={() => call(`${BASE}/${encodeURIComponent(c.key)}`, 'DELETE', undefined)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className={styles.small}>共 {regions.length} 个地区、{regions.reduce((n, g) => n + g.items.length, 0)} 个城市，在用 {regions.reduce((n, g) => n + g.items.filter((c) => c.enabled).length, 0)} 个。</p>
    </>
  );
}

function Rename({ c, regions, save }: { c: C; regions: string[]; save: (name: string, region: string) => void }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(c.name);
  const [rg, setRg] = useState(c.region);
  if (!open) return <button className={small} onClick={() => setOpen(true)}>改</button>;
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      <input className={styles.input} style={{ width: 120 }} value={n} onChange={(e) => setN(e.target.value)} />
      <select className={styles.select} value={rg} onChange={(e) => setRg(e.target.value)}>
        {regions.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <button className={`${styles.btn} ${styles.btnSmall}`} disabled={!n.trim()} onClick={() => { setOpen(false); save(n.trim(), rg); }}>保存</button>
      <button className={small} onClick={() => setOpen(false)}>取消</button>
    </span>
  );
}

function Delete({ c, del }: { c: C; del: () => void }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => setAsk(true)}>删除</button>;
  const used = c.pros + c.posts > 0;
  return (
    <>
      <span className={styles.small}>{used ? `「${c.name}」已有 ${c.pros} 人登记、${c.posts} 条活儿用过，删除会改成停用（不再出现在选项里）。确定？` : `删掉「${c.name}」？`}</span>{' '}
      <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => { setAsk(false); del(); }}>{used ? '确认停用' : '确认删除'}</button>{' '}
      <button className={small} onClick={() => setAsk(false)}>不删</button>
    </>
  );
}
