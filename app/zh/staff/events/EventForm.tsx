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

/** 1.3.1 E：活动所在地区 → 时区（表单里的时间按活动当地时间填） */
export const REGION_TZ: Record<string, string> = { '洛杉矶/橙县': 'America/Los_Angeles', 旧金山湾区: 'America/Los_Angeles', 纽约: 'America/New_York', 中国大陆: 'Asia/Shanghai' };
export const TZ_NAME: Record<string, string> = { 'America/Los_Angeles': '洛杉矶时间', 'America/New_York': '纽约时间', 'Asia/Shanghai': '北京时间' };
const tzOf = (region: string) => REGION_TZ[region] ?? TZ;

/** 签到开始时间默认 = 开始时间前 30 分钟（datetime-local 字符串直接按墙上时间算） */
export function minus30(local: string): string {
  if (!local) return '';
  const t = Date.parse(`${local.slice(0, 16)}:00Z`);
  if (Number.isNaN(t)) return '';
  return new Date(t - 30 * 60_000).toISOString().slice(0, 16);
}

/** datetime-local（活动当地时间）⇄ ISO */
export function toLocalInput(iso: unknown, tz: string = TZ): string {
  if (!iso) return '';
  const d = new Date(String(iso));
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
}
export function fromLocalInput(v: string, tz: string = TZ): string | null {
  if (!v) return null;
  // 以活动当地时区解释（和浏览器所在时区无关）
  const [d, t] = v.split('T');
  if (!d || !t) return null;
  if (tz === TZ) return laWallToIso(d, t.slice(0, 5));
  const wall = Date.parse(`${d}T${t.slice(0, 5)}:00Z`);
  const offsetAt = (ms: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
  };
  let utc = wall - offsetAt(wall);
  utc = wall - offsetAt(utc);
  return new Date(utc).toISOString();
}

export function EventForm({ initial, onSaved }: { initial?: Ev; onSaved: (r: { id: string }) => void }) {
  const [f, setF] = useState({
    title: String(initial?.title ?? ''),
    slug: String(initial?.slug ?? ''),
    summary: String(initial?.summary ?? ''),
    startsAt: toLocalInput(initial?.starts_at, String(initial?.timezone ?? TZ)),
    endsAt: toLocalInput(initial?.ends_at, String(initial?.timezone ?? TZ)),
    // 东哥 11/9 晚：签到开始时间，默认开始前 30 分钟；手动改过就不再跟着开始时间走
    checkinAt: initial?.checkin_starts_at ? toLocalInput(initial.checkin_starts_at, String(initial?.timezone ?? TZ)) : minus30(toLocalInput(initial?.starts_at, String(initial?.timezone ?? TZ))),
    checkinTouched: !!initial?.checkin_starts_at,
    locationName: String(initial?.location_name ?? ''),
    address: String(initial?.address ?? ''),
    capacity: initial?.capacity == null ? '' : String(initial.capacity),
    hardCapacity: initial?.hard_capacity == null ? '' : String(initial.hard_capacity),
    region: String(initial?.region ?? '洛杉矶/橙县'),
    notifyScope: String(initial?.notify_scope ?? 'local'),
    notifyRegions: (initial?.notify_regions as string[]) ?? [],
    videoUrl: String(initial?.video_url ?? ''),
    fee: initial?.fee_cents ? String(Number(initial.fee_cents) / 100) : '0',
    topicTags: (initial?.topic_tags as string[]) ?? [],
    listed: initial ? initial.is_listed !== false : true
  });
  const [busy, setBusy] = useState(false);
  // 1.3 M：活动类型 → 自动生成筹备清单（只在新建时）
  const [prep, setPrep] = useState('lecture');
  // 活动类型的名称、默认人数、默认费用都从后台“活动筹备 → 模板”读，不写死；选了类型自动带出人数和费用，本场仍可改
  type Tpl = { key: string; name: string; default_capacity: number | null; default_hard_capacity?: number | null; default_fee_cents: number | null };
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const applyTpl = (t: Tpl | undefined) => {
    if (!t) return;
    setF((p) => ({
      ...p,
      capacity: t.default_capacity == null ? p.capacity : String(t.default_capacity),
      hardCapacity: t.default_hard_capacity == null ? p.hardCapacity : String(t.default_hard_capacity),
      notifyScope: t.key === 'summit' ? 'all' : p.notifyScope,
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
  const [cover, setCover] = useState<File | null>(null);
  const set = (k: string, v: unknown) =>
    setF((p) => ({ ...p, [k]: v, ...(k === 'startsAt' && !p.checkinTouched ? { checkinAt: minus30(String(v)) } : {}) }));

  async function save() {
    setBusy(true);
    setErr('');
    const payload = {
      title: f.title,
      ...(initial ? {} : { slug: f.slug, prepTemplate: prep || undefined }),
      summary: f.summary,
      startsAt: fromLocalInput(f.startsAt, tzOf(f.region)),
      endsAt: fromLocalInput(f.endsAt, tzOf(f.region)),
      checkinStartsAt: fromLocalInput(f.checkinAt || minus30(f.startsAt), tzOf(f.region)),
      timezone: tzOf(f.region),
      locationName: f.locationName,
      address: f.address,
      capacity: f.capacity === '' ? null : Number(f.capacity),
      hardCapacity: f.hardCapacity === '' ? null : Number(f.hardCapacity),
      region: f.region,
      notifyScope: f.notifyScope,
      notifyRegions: f.notifyScope === 'regions' ? f.notifyRegions : [],
      ...(initial ? { videoUrl: f.videoUrl } : {}),
      feeCents: Math.round(Number(f.fee || 0) * 100),
      topicTags: f.topicTags,
      listed: f.listed
    };
    const r = initial
      ? await api<{ id: string }>(`/api/v1/staff/events/${initial.id}`, { method: 'PATCH', body: payload })
      : await api<{ event: { id: string } }>('/api/v1/staff/events', { body: payload });
    if (!r.ok) {
      setBusy(false);
      setErr(r.message);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); // 报错在表单顶部，滚上去让人看到
      return;
    }
    const id = initial ? String(initial.id) : (r.data as { event: { id: string } }).event.id;
    // 封面图（可选）：和活动一起保存；没传的话首页、海报用该类型的默认图
    if (cover) {
      const fd = new FormData();
      fd.append('file', cover);
      const up = await fetch(`/api/v1/staff/events/${id}/cover`, { method: 'POST', body: fd, credentials: 'same-origin' }).then((x) => x.json()).catch(() => null);
      if (!up?.ok) setErr('活动已保存，但封面图没传上去：' + (up?.error?.message ?? '请在活动页再传一次'));
    }
    setBusy(false);
    onSaved({ id });
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
        <label className={styles.label} htmlFor="ev-summary">一句话介绍（首页轮播、海报、报名页都用它）</label>
        <textarea id="ev-summary" className={styles.textarea} value={f.summary} onChange={(e) => set('summary', e.target.value)} />
      </div>
      {input('startsAt', `开始时间（${TZ_NAME[tzOf(f.region)] ?? '当地时间'}）*`, 'datetime-local')}
      {input('endsAt', `结束时间（${TZ_NAME[tzOf(f.region)] ?? '当地时间'}）`, 'datetime-local')}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ev-checkinAt">签到开始时间（{TZ_NAME[tzOf(f.region)] ?? '当地时间'}，默认开始前 30 分钟，可改）</label>
        <input id="ev-checkinAt" className={styles.input} type="datetime-local" value={f.checkinAt} onChange={(e) => setF((p) => ({ ...p, checkinAt: e.target.value, checkinTouched: true }))} />
      </div>
      {input('locationName', '地点名称')}
      {input('address', '地址（用于一键导航）')}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ev-region">所在地区</label>
        <select id="ev-region" className={styles.select} value={f.region} onChange={(e) => set('region', e.target.value)}>
          {['洛杉矶/橙县', '旧金山湾区', '纽约', '美国其他', '中国大陆', '其他'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ev-scope">通知谁</label>
        <select id="ev-scope" className={styles.select} value={f.notifyScope} onChange={(e) => set('notifyScope', e.target.value)}>
          <option value="local">本地区的人（外地的人在首页公告区能看到）</option>
          <option value="regions">本地区 + 指定几个地区</option>
          <option value="all">所有地区（高峰论坛等；只有管理员能选）</option>
        </select>
        {f.notifyScope === 'regions' && (
          <div className={styles.chips}>
            {['洛杉矶/橙县', '旧金山湾区', '纽约', '美国其他', '中国大陆', '其他'].filter((r) => r !== f.region).map((r) => (
              <button key={r} type="button" className={`${styles.chip} ${f.notifyRegions.includes(r) ? styles.chipOn : ''}`} onClick={() => set('notifyRegions', f.notifyRegions.includes(r) ? f.notifyRegions.filter((x) => x !== r) : [...f.notifyRegions, r])}>{r}</button>
            ))}
          </div>
        )}
      </div>
      {input('capacity', '当前上限（报到这个数后进候补；不填 = 不限）', 'number', { min: 0, inputMode: 'numeric' })}
      {input('hardCapacity', '硬上限（场地坐得下的极限；加名额最多加到这里）', 'number', { min: 0, inputMode: 'numeric' })}
      {initial && input('videoUrl', '活动视频链接（活动后填；YouTube 会嵌入回顾页，视频号给链接）')}
      {initial && initial.slug ? <p className={styles.small}>网站回顾页：<a href={`/zh/e/${String(initial.slug)}/recap`} target="_blank" rel="noreferrer">/zh/e/{String(initial.slug)}/recap</a>（照片发布、回顾审核后自动有内容）</p> : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ev-cover">封面图（选填；不传就用这个类型的默认图）</label>
        <input id="ev-cover" type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
      </div>
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
