'use client';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api } from '@/components/crm/client';
import { laWallToIso } from '@/lib/laDate';

export const TOPICS: Record<string, string> = {
  adu: 'ADU、加建、小型开发',
  financing: '贷款融资',
  investment: '投资、项目推介',
  china: '中国企业出海、中国考察',
  wealth: '税务、保险、资产配置',
  transaction: '交易流程、托管与产权',
  construction: '设计、施工、消防与建筑规范',
  operations: '物业管理、商业运营与招商',
  ai: 'AI 与房地产科技'
};

type Ev = Record<string, unknown>;
const TZ = 'America/Los_Angeles';

/** datetime-local（洛杉矶时间）⇄ ISO */
export function toLocalInput(iso: unknown): string {
  if (!iso) return '';
  const d = new Date(String(iso));
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
}
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  // 以洛杉矶时区解释（和浏览器所在时区无关；原写法在非洛杉矶时区的电脑上会差出时差）
  const [d, t] = v.split('T');
  if (!d || !t) return null;
  return laWallToIso(d, t.slice(0, 5));
}

export function EventForm({ initial, onSaved }: { initial?: Ev; onSaved: (r: { id: string }) => void }) {
  const [f, setF] = useState({
    title: String(initial?.title ?? ''),
    slug: String(initial?.slug ?? ''),
    summary: String(initial?.summary ?? ''),
    startsAt: toLocalInput(initial?.starts_at),
    endsAt: toLocalInput(initial?.ends_at),
    locationName: String(initial?.location_name ?? ''),
    address: String(initial?.address ?? ''),
    capacity: initial?.capacity == null ? '' : String(initial.capacity),
    fee: initial?.fee_cents ? String(Number(initial.fee_cents) / 100) : '0',
    topicTags: (initial?.topic_tags as string[]) ?? [],
    listed: initial ? initial.is_listed !== false : true
  });
  const [busy, setBusy] = useState(false);
  // 1.3 M：活动类型 → 自动生成筹备清单（只在新建时）
  const [prep, setPrep] = useState('lecture');
  // 活动类型的名称、默认人数、默认费用都从后台“活动筹备 → 模板”读，不写死；选了类型自动带出人数和费用，本场仍可改
  type Tpl = { key: string; name: string; default_capacity: number | null; default_fee_cents: number | null };
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const applyTpl = (t: Tpl | undefined) => {
    if (!t) return;
    setF((p) => ({
      ...p,
      capacity: t.default_capacity == null ? p.capacity : String(t.default_capacity),
      fee: t.default_fee_cents == null ? p.fee : String(t.default_fee_cents / 100)
    }));
  };
  useEffect(() => {
    if (initial) return;
    api<{ templates: Tpl[] }>('/api/v1/staff/prep/templates').then((r) => {
      if (!r.ok || !r.data.templates.length) return;
      setTpls(r.data.templates);
      const first = r.data.templates.find((t) => t.key === 'lecture') ?? r.data.templates[0];
      setPrep(first.key);
      applyTpl(first);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);
  const [err, setErr] = useState('');
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setErr('');
    const payload = {
      title: f.title,
      ...(initial ? {} : { slug: f.slug, prepTemplate: prep || undefined }),
      summary: f.summary,
      startsAt: fromLocalInput(f.startsAt),
      endsAt: fromLocalInput(f.endsAt),
      locationName: f.locationName,
      address: f.address,
      capacity: f.capacity === '' ? null : Number(f.capacity),
      feeCents: Math.round(Number(f.fee || 0) * 100),
      topicTags: f.topicTags,
      listed: f.listed
    };
    const r = initial
      ? await api<{ id: string }>(`/api/v1/staff/events/${initial.id}`, { method: 'PATCH', body: payload })
      : await api<{ event: { id: string } }>('/api/v1/staff/events', { body: payload });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onSaved(initial ? { id: String(initial.id) } : (r.data as { event: { id: string } }).event);
  }

  const input = (k: keyof typeof f, label: string, type = 'text', extra: Record<string, unknown> = {}) => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`ev-${k}`}>{label}</label>
      <input id={`ev-${k}`} className={styles.input} type={type} value={f[k] as string} onChange={(e) => set(k, e.target.value)} {...extra} />
    </div>
  );

  return (
    <div className={styles.card}>
      {err && <div className={styles.error}>{err}</div>}
      {input('title', '活动标题 *')}
      {!initial && input('slug', '链接名（选填，英文小写；不填自动生成）')}
      {!initial && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="ev-prep">活动类型（自动生成筹备清单）</label>
          <select id="ev-prep" className={styles.select} value={prep} onChange={(e) => { setPrep(e.target.value); applyTpl(tpls.find((t) => t.key === e.target.value)); }}>
            {tpls.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            <option value="">不生成清单</option>
          </select>
          <p className={styles.small}>选了类型会自动填上默认名额和费用（在“活动筹备 → 模板”里改默认值），这一场可以再改。</p>
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ev-summary">简介</label>
        <textarea id="ev-summary" className={styles.textarea} value={f.summary} onChange={(e) => set('summary', e.target.value)} />
      </div>
      {input('startsAt', '开始时间（洛杉矶时间）*', 'datetime-local')}
      {input('endsAt', '结束时间', 'datetime-local')}
      {input('locationName', '地点名称')}
      {input('address', '地址（用于一键导航）')}
      {input('capacity', '名额（不填 = 不限）', 'number', { min: 0, inputMode: 'numeric' })}
      {input('fee', '费用（美元，0 = 免费）', 'number', { min: 0, step: '0.01', inputMode: 'decimal' })}
      <div className={styles.field}>
        <span className={styles.label}>活动主题（决定报名时优先问哪些题）</span>
        <div className={styles.chips}>
          {Object.entries(TOPICS).map(([k, v]) => {
            const on = f.topicTags.includes(k);
            return (
              <button key={k} type="button" className={`${styles.chip} ${on ? styles.chipOn : ''}`} onClick={() => set('topicTags', on ? f.topicTags.filter((x) => x !== k) : [...f.topicTags, k])}>
                {v}
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>
          <input type="checkbox" checked={f.listed} onChange={(e) => set('listed', e.target.checked)} /> 公开（出现在网站和小程序的活动列表；不勾选则只凭链接或二维码进入）
        </label>
      </div>
      <button className={`${styles.btn} ${styles.btnBlock}`} disabled={busy} onClick={save}>
        {busy ? '处理中…' : initial ? '保存修改' : '创建活动'}
      </button>
    </div>
  );
}
