'use client';
/**
 * 活动筹备清单总览（1.3 M）：各场进度 + 给已有活动生成清单 + 模板编辑（加、删、改、调顺序）。
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { Msg, StaffGate, can } from '@/components/crm/staff/StaffGate';
import { api, fmtDateTime } from '@/components/crm/client';

type Row = { event_id: string; title: string; starts_at: string; template_key: string | null; total: number; done: number; overdue: number };
type TItem = { id: number; sort_order: number; anchor: 'start' | 'end'; offset_minutes: number; when_label: string; title: string; role: string };
type Tpl = { id: number; key: string; name: string; roles: string[]; shooting_list: string | null; settings: Record<string, unknown>; items: TItem[] };
type Ev = { id: string; title: string; starts_at: string };

export default function PrepIndex() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [gen, setGen] = useState({ eventId: '', template: 'lecture' });
  const load = useCallback(async () => {
    const r = await api<{ preps: Row[] }>('/api/v1/staff/prep');
    if (r.ok) setRows(r.data.preps);
    else setMsg({ ok: false, text: r.message });
    const t = await api<{ templates: Tpl[] }>('/api/v1/staff/prep/templates');
    if (t.ok) setTpls(t.data.templates);
    const e = await api<{ events: Ev[] }>('/api/v1/staff/events');
    if (e.ok) setEvents(e.data.events.filter((x) => new Date(x.starts_at).getTime() > Date.now() - 86400e3));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const has = new Set(rows.map((r) => r.event_id));
  return (
    <StaffGate title="活动筹备清单" role={['ops', 'checkin']}>
      {(s) => (
        <>
          <Msg m={msg} />
          <p className={styles.small}>建活动时选“活动类型”就会自动生成清单；负责人截止前一天收到邮件提醒，活动前 2 天东哥收到一份未完成汇总。</p>
          {rows.length === 0 && <p className={styles.muted}>还没有任何活动生成筹备清单。</p>}
          {rows.map((r) => (
            <Link key={r.event_id} href={`/zh/staff/prep/${r.event_id}`} className={styles.card} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <p className={styles.cardTitle} style={{ marginBottom: 4 }}>{r.title}</p>
              <p className={styles.small} style={{ margin: 0 }}>
                {fmtDateTime(r.starts_at)} · {tpls.find((t) => t.key === r.template_key)?.name ?? r.template_key ?? ''} · 完成 {r.done}/{r.total}
                {r.overdue ? <span style={{ color: '#b54a4a' }}> · {r.overdue} 项已过截止</span> : null}
              </p>
              <div style={{ height: 6, background: 'var(--line, #eee)', borderRadius: 3, marginTop: 8 }}>
                <div style={{ width: `${r.total ? Math.round((r.done / r.total) * 100) : 0}%`, height: 6, background: 'var(--gold)', borderRadius: 3 }} />
              </div>
            </Link>
          ))}

          {can(s, 'ops') && (
            <>
              <h2 className={styles.h2}>给已有活动生成清单</h2>
              <div className={styles.card}>
                <div className={styles.inputRow}>
                  <select className={styles.select} value={gen.eventId} onChange={(e) => setGen({ ...gen, eventId: e.target.value })} aria-label="活动">
                    <option value="">选活动</option>
                    {events.filter((e) => !has.has(e.id)).map((e) => <option key={e.id} value={e.id}>{fmtDateTime(e.starts_at)} {e.title}</option>)}
                  </select>
                  <select className={styles.select} value={gen.template} onChange={(e) => setGen({ ...gen, template: e.target.value })} aria-label="模板">
                    {tpls.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
                  </select>
                  <button
                    className={styles.btn}
                    disabled={!gen.eventId}
                    onClick={async () => {
                      const r = await api('/api/v1/staff/prep', { body: gen });
                      setMsg(r.ok ? { ok: true, text: '清单已生成' } : { ok: false, text: r.message });
                      setGen({ ...gen, eventId: '' });
                      load();
                    }}
                  >
                    生成清单
                  </button>
                </div>
              </div>

              <h2 className={styles.h2}>模板</h2>
              <p className={styles.small}>改模板只影响以后生成的清单，已生成的不变。时间填“开始前几天 / 结束后几小时”等，系统按活动时间算截止。</p>
              {tpls.map((t) => <TemplateEditor key={t.id} t={t} onMsg={setMsg} reload={load} />)}
              <NewTemplate onMsg={setMsg} reload={load} />
            </>
          )}
        </>
      )}
    </StaffGate>
  );
}

const UNITS = [
  { v: 1440, l: '天' },
  { v: 60, l: '小时' },
  { v: 1, l: '分钟' }
];
function split(offset: number) {
  const a = Math.abs(offset);
  const u = a && a % 1440 === 0 ? 1440 : a && a % 60 === 0 ? 60 : a ? 1 : 1440;
  return { dir: offset < 0 ? -1 : 1, n: a / u, unit: u };
}

function TemplateEditor({ t, onMsg, reload }: { t: Tpl; onMsg: (m: { ok: boolean; text: string }) => void; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(t.name);
  const [roles, setRoles] = useState(t.roles.join('\n'));
  const [shoot, setShoot] = useState(t.shooting_list ?? '');
  const [pitch, setPitch] = useState(String(t.settings.pitchMinutes ?? ''));
  const [collect, setCollect] = useState(!!t.settings.collectIntro);
  const saveTpl = async () => {
    const settings: Record<string, unknown> = { ...t.settings, collectIntro: collect };
    if (pitch) settings.pitchMinutes = Number(pitch);
    else delete settings.pitchMinutes;
    const r = await api('/api/v1/staff/prep/templates', { body: { id: t.id, name, roles: roles.split('\n').map((x) => x.trim()).filter(Boolean), shootingList: shoot, settings } });
    onMsg(r.ok ? { ok: true, text: `已保存：${name}` } : { ok: false, text: r.message });
    reload();
  };
  const move = async (i: number, d: number) => {
    const ids = t.items.map((x) => x.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await api(`/api/v1/staff/prep/templates/${t.id}`, { body: { order: ids } });
    reload();
  };
  return (
    <div className={styles.card}>
      <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setOpen(!open)} style={{ width: '100%', textAlign: 'left' }}>
        {open ? '▾' : '▸'} {t.name}（{t.items.length} 项）
      </button>
      {open && (
        <>
          <label className={styles.label}>名称</label>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
          <label className={styles.label}>负责角色（每行一个）</label>
          <textarea className={styles.input} style={{ minHeight: 100 }} value={roles} onChange={(e) => setRoles(e.target.value)} />
          <label className={styles.label}>拍摄清单</label>
          <textarea className={styles.input} style={{ minHeight: 120 }} value={shoot} onChange={(e) => setShoot(e.target.value)} />
          <div className={styles.inputRow} style={{ marginTop: 8, alignItems: 'center' }}>
            <label className={styles.small}>每人介绍限时（分钟，可空）</label>
            <input className={styles.input} type="number" min={1} max={30} value={pitch} onChange={(e) => setPitch(e.target.value)} style={{ maxWidth: 90 }} />
            <label className={styles.small}>
              <input type="checkbox" checked={collect} onChange={(e) => setCollect(e.target.checked)} /> 报名时收集“一句话介绍”、会后发电子名册
            </label>
          </div>
          <div className={styles.btnRow} style={{ marginTop: 8 }}>
            <button className={styles.btn} onClick={saveTpl}>保存模板设置</button>
            <button
              className={`${styles.btn} ${styles.btnQuiet}`}
              onClick={async () => {
                if (!window.confirm(`删除模板「${t.name}」？已生成的清单不受影响。`)) return;
                const r = await api(`/api/v1/staff/prep/templates/${t.id}`, { method: 'DELETE' });
                onMsg(r.ok ? { ok: true, text: '模板已删除' } : { ok: false, text: r.message });
                reload();
              }}
            >
              删除模板
            </button>
          </div>

          <h3 className={styles.label} style={{ marginTop: 16 }}>事项</h3>
          {t.items.map((it, i) => (
            <ItemRow key={it.id} tplId={t.id} it={it} roles={t.roles} onMove={(d) => move(i, d)} onMsg={onMsg} reload={reload} />
          ))}
          <ItemRow tplId={t.id} roles={t.roles} onMsg={onMsg} reload={reload} />
        </>
      )}
    </div>
  );
}

function ItemRow({ tplId, it, roles, onMove, onMsg, reload }: { tplId: number; it?: TItem; roles: string[]; onMove?: (d: number) => void; onMsg: (m: { ok: boolean; text: string }) => void; reload: () => void }) {
  const sp = split(it?.offset_minutes ?? -1440);
  const [title, setTitle] = useState(it?.title ?? '');
  const [role, setRole] = useState(it?.role ?? '');
  const [anchor, setAnchor] = useState<'start' | 'end'>(it?.anchor ?? 'start');
  const [dir, setDir] = useState(sp.dir);
  const [n, setN] = useState(String(sp.n));
  const [unit, setUnit] = useState(sp.unit);
  const [label, setLabel] = useState(it?.when_label ?? '');
  const save = async () => {
    const offsetMinutes = dir * (Number(n) || 0) * unit;
    // 改了时间但“显示为”没改：清掉旧的显示文字，按新时间自动生成
    const stale = it && label === it.when_label && (offsetMinutes !== it.offset_minutes || anchor !== it.anchor);
    const r = await api(`/api/v1/staff/prep/templates/${tplId}`, {
      body: { item: { id: it?.id, title, role, anchor, offsetMinutes, whenLabel: stale ? undefined : label || undefined } }
    });
    onMsg(r.ok ? { ok: true, text: it ? '已保存' : '已加上' } : { ok: false, text: r.message });
    if (r.ok && !it) {
      setTitle('');
      setLabel('');
    }
    reload();
  };
  return (
    <div style={{ borderTop: '1px solid var(--line, #eee)', padding: '10px 0' }}>
      {!it && <p className={styles.small} style={{ margin: '0 0 4px' }}>新加一项</p>}
      <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="事项内容" aria-label="事项内容" />
      <div className={styles.inputRow} style={{ marginTop: 6 }}>
        <select className={styles.select} value={anchor} onChange={(e) => setAnchor(e.target.value as 'start' | 'end')} aria-label="相对">
          <option value="start">活动开始</option>
          <option value="end">活动结束</option>
        </select>
        <select className={styles.select} value={dir} onChange={(e) => setDir(Number(e.target.value))} aria-label="前后">
          <option value={-1}>前</option>
          <option value={1}>后</option>
        </select>
        <input className={styles.input} type="number" min={0} value={n} onChange={(e) => setN(e.target.value)} style={{ maxWidth: 80 }} aria-label="数量" />
        <select className={styles.select} value={unit} onChange={(e) => setUnit(Number(e.target.value))} aria-label="单位">
          {UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
        </select>
        <input className={styles.input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="显示为（可空，如“当天 −1 小时”）" aria-label="显示为" />
      </div>
      <div className={styles.inputRow} style={{ marginTop: 6 }}>
        <input className={styles.input} list={`roles-${tplId}`} value={role} onChange={(e) => setRole(e.target.value)} placeholder="负责角色（多个用“、”分开）" aria-label="负责角色" />
        <datalist id={`roles-${tplId}`}>{roles.map((r) => <option key={r} value={r} />)}</datalist>
        <button className={styles.btn} disabled={!title.trim() || !role.trim()} onClick={save}>{it ? '保存' : '加一项'}</button>
        {it && (
          <>
            <button className={`${styles.btn} ${styles.btnQuiet}`} aria-label="上移" onClick={() => onMove?.(-1)}>↑</button>
            <button className={`${styles.btn} ${styles.btnQuiet}`} aria-label="下移" onClick={() => onMove?.(1)}>↓</button>
            <button
              className={`${styles.btn} ${styles.btnQuiet}`}
              onClick={async () => {
                const r = await api(`/api/v1/staff/prep/templates/${tplId}?item=${it.id}`, { method: 'DELETE' });
                onMsg(r.ok ? { ok: true, text: '已删除这一项' } : { ok: false, text: r.message });
                reload();
              }}
            >
              删除
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function NewTemplate({ onMsg, reload }: { onMsg: (m: { ok: boolean; text: string }) => void; reload: () => void }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>新建一种活动类型</p>
      <div className={styles.inputRow}>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="名称，如“晚宴（40 人）”" aria-label="名称" />
        <input className={styles.input} value={key} onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="英文代号，如 dinner" aria-label="代号" />
        <button
          className={styles.btn}
          disabled={!name.trim() || !key}
          onClick={async () => {
            const r = await api('/api/v1/staff/prep/templates', { body: { key, name, roles: ['总负责 / 主持', '签到接待', '摄影摄像', '物料茶歇', '会后运营'], settings: {} } });
            onMsg(r.ok ? { ok: true, text: '已新建，展开后加事项' } : { ok: false, text: r.message });
            setName('');
            setKey('');
            reload();
          }}
        >
          新建
        </button>
      </div>
    </div>
  );
}
