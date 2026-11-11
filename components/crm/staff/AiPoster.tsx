'use client';
/**
 * 后台活动页「生成海报」（AI 海报，东哥 11/10）：
 * ① 选活动类型、风格（可填画面主题）→ 出 4 张候选主视觉 → 点选一张；不满意“再来一批”（每场有上限）
 * ② 文案：片名 + 宣传语（可让系统给 5 组备选），演职员表（主办 / 主讲 / 协办），主讲人真实照片
 * ③ 海报上的每一处字都能直接改（手机上也行）：改完点“更新海报”，只重排字、不重新出图、不花钱；可加 1–2 行自由字、可把画面往上挪
 * ④ 预览（手机长按存相册）+ 下载竖版 / 方版 / 公众号头图。只在网站后台用，不进小程序。
 */
import { useCallback, useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api } from '@/components/crm/client';
import { DEFAULT_STYLE } from '@/lib/poster/styles';

type Gen = { id: string; batch_id: string; kind: string; style: string | null; event_type: string | null; provider: string; model: string | null; prompt: string; image_url: string | null; cost_usd: number; status: string; error: string | null; created_at: string };
type State = {
  event: { id: string; title: string; slug: string };
  poster: { gen_id: string | null; style: string | null; film_title: string | null; tagline: string | null; host: string | null; speaker: string | null; co_host: string | null; speaker_photo_url: string | null; image_cap: number | null; texts?: Texts | null } | null;
  gens: Gen[];
  used: number;
  cap: number;
  defaultCap: number;
  spentUsd: number;
  provider: { key: string; label: string; model: string; costPerImage: number; note: string | null; chosen: string | null };
  providers: { key: string; label: string; model: string; costPerImage: number; configured: boolean; problem?: string | null }[];
  textDefaults: Record<string, string>;
  balanceUsd: number | null;
  types: { key: string; label: string }[];
  styles: { key: string; group: string; label: string }[];
};
type Extra = { text: string; pos: 'aboveTitle' | 'belowSubtitle' | 'bottom'; size: 'L' | 'M' | 'S' };
type Texts = { tagline?: string; filmTitle?: string; filmSubtitle?: string; titleEn?: string; subtitle?: string; bigDate?: string; dateNote?: string; place?: string; billing?: string; extras?: Extra[]; lift?: number };
const TEXT_FIELDS: [keyof Omit<Texts, 'extras' | 'lift'>, string, number][] = [
  ['tagline', '顶部悬念语', 30], ['filmTitle', '主片名', 12], ['filmSubtitle', '副片名（不填不显示）', 12], ['titleEn', '片名下英文小字（不填不显示）', 40],
  ['subtitle', '副标题那句话', 40], ['bigDate', '日期大字', 12], ['dateNote', '日期旁小字（周几、时间）', 40], ['place', '地点', 80], ['billing', '底部一排小字', 140]
];
const POS: [Extra['pos'], string][] = [['aboveTitle', '片名上方'], ['belowSubtitle', '副标题下方'], ['bottom', '底部']];
const SIZES: [Extra['size'], string][] = [['L', '大'], ['M', '中'], ['S', '小']];
const EMPTY_EX: Extra = { text: '', pos: 'belowSubtitle', size: 'M' };
const usd = (n: number) => (n >= 0.01 ? n.toFixed(2) : n.toFixed(3));
const GROUPS: [string, string][] = [['film', '好莱坞大片'], ['ai', 'AI 未来感'], ['photo', '写实摄影'], ['guofeng', '国风']];

export function AiPoster({ eventId, isAdmin }: { eventId: string; isAdmin: boolean }) {
  const [st, setSt] = useState<State | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [type, setType] = useState('lecture');
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [subject, setSubject] = useState('');
  const [form, setForm] = useState({ genId: '', filmTitle: '', tagline: '', host: 'SAREC 中美房地产商会', speaker: '', coHost: '', imageCap: '' });
  const [ideas, setIdeas] = useState<{ title: string; tagline: string }[]>([]);
  const [ver, setVer] = useState(0);
  const [dcap, setDcap] = useState('');
  const [tx, setTx] = useState<Texts>({});
  const [ex, setEx] = useState<Extra[]>([EMPTY_EX, EMPTY_EX]);
  const [lift, setLift] = useState(0);

  const apply = useCallback((s: State) => {
    setSt(s);
    const p = s.poster;
    setForm((f) => ({
      genId: p?.gen_id ?? f.genId,
      filmTitle: p?.film_title ?? f.filmTitle,
      tagline: p?.tagline ?? f.tagline,
      host: p ? p.host ?? '' : f.host,
      speaker: p?.speaker ?? f.speaker,
      coHost: p?.co_host ?? f.coHost,
      imageCap: p?.image_cap ? String(p.image_cap) : ''
    }));
    setDcap(String(s.defaultCap));
    const t = p?.texts ?? {};
    setTx({ ...t, tagline: t.tagline ?? p?.tagline ?? '', filmTitle: t.filmTitle ?? p?.film_title ?? '' });
    setEx([0, 1].map((i) => ({ ...EMPTY_EX, ...(t.extras?.[i] ?? {}) })));
    setLift(Math.round((t.lift ?? 0) * 100));
    setVer((v) => v + 1);
  }, []);
  const load = useCallback(async () => {
    const r = await api<{ state: State }>(`/api/v1/staff/events/${eventId}/ai-poster`);
    if (r.ok) apply(r.data.state);
    else setMsg({ ok: false, text: r.message });
  }, [eventId, apply]);
  useEffect(() => { load(); }, [load]);

  async function post(action: string, extra: Record<string, unknown>, label: string, done?: string) {
    setBusy(label);
    setMsg(null);
    const r = await api<{ state?: State; ideas?: { title: string; tagline: string }[]; note?: string | null }>(`/api/v1/staff/events/${eventId}/ai-poster`, { body: { action, ...extra } });
    setBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    if (r.data.state) apply(r.data.state);
    if (r.data.ideas) {
      setIdeas(r.data.ideas);
      if (r.data.note) setMsg({ ok: false, text: r.data.note });
    }
    if (done) setMsg({ ok: true, text: done });
  }
  const texts = () => ({ ...tx, extras: ex.filter((x) => x.text.trim()), lift: lift / 100 });
  const save = (extra: Record<string, unknown> = {}, done = '已保存') => post('save', { ...form, filmTitle: tx.filmTitle ?? '', tagline: tx.tagline ?? '', texts: texts(), style: undefined, ...extra }, 'save', done);

  async function upload(file: File | null) {
    setBusy('photo');
    setMsg(null);
    let res: Response | null;
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      res = await fetch(`/api/v1/staff/events/${eventId}/ai-poster/speaker`, { method: 'POST', body: fd, credentials: 'same-origin' }).catch(() => null);
    } else res = await fetch(`/api/v1/staff/events/${eventId}/ai-poster/speaker`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => null);
    const j = (await res?.json().catch(() => null)) as { ok: boolean; state?: State; error?: { message: string } } | null;
    setBusy(null);
    if (j?.ok && j.state) { apply(j.state); setMsg({ ok: true, text: file ? '主讲人照片已上传' : '已去掉主讲人照片' }); }
    else setMsg({ ok: false, text: j?.error?.message ?? '上传没成功，请再试一次' });
  }

  if (!st) return <p className={styles.small}>正在读取 AI 海报…</p>;
  const images = st.gens.filter((g) => g.status === 'ok' && g.image_url);
  const batches = Array.from(new Set(images.map((g) => g.batch_id)));
  const lastImg = st.gens.find((g) => g.kind === 'image');
  const left = st.cap - st.used;
  const chosen = form.genId || st.poster?.gen_id || '';
  const v = `${ver}-${chosen}`;
  const cost = st.provider.costPerImage;
  const nNext = Math.min(4, left);
  const costNote = cost > 0 ? `每张约 ${usd(cost)} 美元，这一批约 ${usd(cost * nNext)} 美元` : '免费额度内不花钱';

  return (
    <div className={styles.card} style={{ marginTop: '1rem' }}>
      <p className={styles.cardTitle}>AI 海报（主视觉由 AI 画，字和二维码由系统叠上去）</p>
      {msg && <p className={msg.ok ? styles.success : styles.error}>{msg.text}</p>}
      <p className={styles.small}>
        画图服务：{st.provider.label}{st.provider.model && st.provider.key !== 'placeholder' ? `（${st.provider.model}，${cost > 0 ? `每张约 ${usd(cost)} 美元` : '免费额度内不花钱'}）` : ''}。
        {st.balanceUsd !== null ? ` AI Gateway 余额 $${st.balanceUsd}。` : ''}
        {st.provider.note ? ` ${st.provider.note}` : ''} 本场已生成 {st.used} / {st.cap} 张，记账花费 ${st.spentUsd}。
        只在网站后台生成和下载，用于朋友圈、群、公众号；不放进小程序。
      </p>
      <p className={styles.small} style={{ marginTop: 6 }}>切换画图服务（管理员，立即生效）：</p>
      <div className={styles.chips}>
        {st.providers.map((p) => (
          <button key={p.key} type="button" disabled={!!busy} className={`${styles.chip} ${st.provider.key === p.key ? styles.chipOn : ''}`} onClick={() => post('provider', { value: p.key }, '切换中', `已切换到 ${p.label}`)}>
            {p.label}{p.key !== 'placeholder' ? (p.problem ? '（密钥格式不对）' : p.configured ? `（约 $${p.costPerImage}/张）` : '（密钥未填）') : ''}
          </button>
        ))}
      </div>

      <p className={styles.label} style={{ marginTop: 12 }}>① 活动类型</p>
      <div className={styles.chips}>
        {st.types.map((t) => (
          <button key={t.key} type="button" className={`${styles.chip} ${type === t.key ? styles.chipOn : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
      </div>
      <p className={styles.label} style={{ marginTop: 12 }}>② 风格</p>
      {GROUPS.map(([g, label]) => (
        <div key={g} style={{ marginBottom: 6 }}>
          <span className={styles.small} style={{ marginRight: 8 }}>{label}</span>
          <span className={styles.chips} style={{ display: 'inline-flex' }}>
            {st.styles.filter((s) => s.group === g).map((s) => (
              <button key={s.key} type="button" className={`${styles.chip} ${style === s.key ? styles.chipOn : ''}`} onClick={() => setStyle(s.key)}>{s.label}</button>
            ))}
          </span>
        </div>
      ))}
      <label className={styles.field} style={{ marginTop: 8 }}>
        <span className={styles.label}>画面主题（可不填；建议用英文写，比如 a sleek driverless electric robotaxi）</span>
        <input className={styles.input} value={subject} maxLength={300} onChange={(e) => setSubject(e.target.value)} placeholder="不填就用活动类型的默认画面" />
      </label>
      <p className={styles.small}>画面里不会出现文字、真人人脸、品牌商标和可识别车型（指令里已经写死）；品牌名写进来也会被自动去掉。</p>
      <div className={styles.btnRow}>
        <button className={styles.btn} disabled={!!busy || left <= 0} onClick={() => post('generate', { type, style, subject }, 'gen', '新一批候选图出来了，点一张选中')}>
          {busy === 'gen' ? '正在画（约半分钟到两分钟）…' : `${batches.length ? '再来一批' : `出 ${nNext} 张候选主视觉`}（会花钱）`}
        </button>
      </div>
      <p className={styles.small}>{costNote}。本场还能出 {left} 张（上限 {st.cap} 张，防止点多了）。</p>
      {lastImg?.status === 'failed' && <p className={styles.error}>最近一张没画出来：{lastImg.error}</p>}

      {batches.map((b) => (
        <div key={b} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, marginTop: 12 }}>
          {images.filter((g) => g.batch_id === b).map((g) => (
            <button key={g.id} type="button" onClick={() => { setForm((f) => ({ ...f, genId: g.id })); save({ genId: g.id }, '已选中这张主视觉'); }}
              title={g.prompt}
              style={{ padding: 0, border: chosen === g.id ? '3px solid var(--gold)' : '3px solid transparent', borderRadius: 8, background: 'none', cursor: 'pointer' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.image_url!} alt="候选主视觉" style={{ display: 'block', width: '100%', aspectRatio: '2 / 3', borderRadius: 6, objectFit: 'cover' }} loading="lazy" />
              <span className={styles.small}>{st.styles.find((s) => s.key === g.style)?.label ?? ''}{chosen === g.id ? ' · 已选' : ''}</span>
            </button>
          ))}
        </div>
      ))}

      <p className={styles.label} style={{ marginTop: 16 }}>③ 海报上的字（手机上也能改；空着的按活动信息自动填，灰字就是自动的内容）</p>
      <div className={styles.btnRow}>
        <button className={`${styles.btn} ${styles.btnGhost}`} disabled={!!busy} onClick={() => post('copy', { type }, 'copy')}>{busy === 'copy' ? '正在想…' : '给我 5 组片名和宣传语'}</button>
      </div>
      {ideas.length > 0 && (
        <div className={styles.chips} style={{ marginTop: 8 }}>
          {ideas.map((x, i) => (
            <button key={i} type="button" className={styles.chip} onClick={() => setTx((t) => ({ ...t, filmTitle: x.title, tagline: x.tagline }))}>
              <b>{x.title}</b>　{x.tagline}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.25rem 1rem' }}>
        {TEXT_FIELDS.map(([k, label, max]) => (
          <label key={k} className={styles.field}>
            <span className={styles.label}>{label}</span>
            {k === 'billing' ? (
              <textarea className={styles.textarea} rows={2} value={tx[k] ?? ''} maxLength={max} onChange={(e) => setTx({ ...tx, [k]: e.target.value })} placeholder={st.textDefaults[k] || ''} />
            ) : (
              <input className={styles.input} value={tx[k] ?? ''} maxLength={max} onChange={(e) => setTx({ ...tx, [k]: e.target.value })} placeholder={st.textDefaults[k] || ''} />
            )}
          </label>
        ))}
      </div>
      {ex.map((x, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 6, marginTop: 8 }}>
          <label className={styles.field} style={{ marginBottom: 0 }}>
            <span className={styles.label}>自由加字 {i + 1}（自己决定写什么，不填不显示）</span>
            <input className={styles.input} value={x.text} maxLength={24} placeholder={i === 0 ? '比如：名额有限' : ''} onChange={(e) => { const v = e.target.value; setEx((prev) => prev.map((y, j) => (j === i ? { ...y, text: v } : y))); }} />
          </label>
          <div className={styles.chips}>
            {POS.map(([k, l]) => <button key={k} type="button" className={`${styles.chip} ${x.pos === k ? styles.chipOn : ''}`} onClick={() => setEx((prev) => prev.map((y, j) => (j === i ? { ...y, pos: k } : y)))}>{l}</button>)}
            {SIZES.map(([k, l]) => <button key={k} type="button" className={`${styles.chip} ${x.size === k ? styles.chipOn : ''}`} onClick={() => setEx((prev) => prev.map((y, j) => (j === i ? { ...y, size: k } : y)))}>{l}</button>)}
          </div>
        </div>
      ))}
      <label className={styles.field} style={{ marginTop: 8 }}>
        <span className={styles.label}>画面上移 {lift}%（片名压住车时往上挪；0 = 不挪）</span>
        <input type="range" min={0} max={25} step={1} value={lift} onChange={(e) => setLift(Number(e.target.value))} style={{ width: '100%' }} />
      </label>
      <p className={styles.label} style={{ marginTop: 12 }}>演职员表（底部小字没自己填时用这几项）</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.25rem 1rem' }}>
        <label className={styles.field}><span className={styles.label}>主办</span><input className={styles.input} value={form.host} maxLength={30} onChange={(e) => setForm({ ...form, host: e.target.value })} /></label>
        <label className={styles.field}><span className={styles.label}>主讲</span><input className={styles.input} value={form.speaker} maxLength={30} onChange={(e) => setForm({ ...form, speaker: e.target.value })} placeholder="不填就不显示" /></label>
        <label className={styles.field}><span className={styles.label}>协办</span><input className={styles.input} value={form.coHost} maxLength={30} onChange={(e) => setForm({ ...form, coHost: e.target.value })} placeholder="不填就不显示" /></label>
        <label className={styles.field}><span className={styles.label}>本场主视觉上限（默认 {st.defaultCap} 张）</span><input className={styles.input} inputMode="numeric" value={form.imageCap} onChange={(e) => setForm({ ...form, imageCap: e.target.value.replace(/\D/g, '') })} placeholder={String(st.defaultCap)} /></label>
      </div>
      <p className={styles.small}>上面各项不写价格、“免费”和报名人数；自由加字由你自己决定。报名码按活动自动生成。</p>
      <div className={styles.btnRow}>
        <span className={styles.small}>主讲人照片（只用真实照片，不让 AI 画人）：{st.poster?.speaker_photo_url ? '已上传' : '没有'}</span>
        <label className={`${styles.btn} ${styles.btnQuiet}`} style={{ cursor: 'pointer' }}>
          {busy === 'photo' ? '上传中…' : '上传照片'}
          <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0] ?? null)} />
        </label>
        {st.poster?.speaker_photo_url && <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => upload(null)}>去掉照片</button>}
      </div>
      <div className={styles.btnRow}>
        <button className={styles.btn} disabled={!!busy} onClick={() => save({}, '海报已更新（只重排字，没有花钱）')}>{busy === 'save' ? '更新中…' : '更新海报（不花钱）'}</button>
      </div>

      {chosen && st.poster?.gen_id && (
        <>
          <p className={styles.label} style={{ marginTop: 16 }}>④ 成品（点“更新海报”后自动刷新）</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/v1/staff/events/${eventId}/ai-poster/render?size=tall&inline=1&v=${v}`} alt="竖版海报成品" style={{ display: 'block', width: '100%', maxWidth: 440, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
          <p className={styles.small} style={{ marginTop: 6 }}>手机上：长按上面的图 →「存储到照片 / 保存图片」，再发微信。</p>
          <div className={styles.btnRow}>
            {([['tall', '下载竖版'], ['square', '下载方版'], ['oa', '下载公众号头图']] as const).map(([k, label]) => (
              <a key={k} className={`${styles.btn} ${k === 'tall' ? '' : styles.btnQuiet}`} href={`/api/v1/staff/events/${eventId}/ai-poster/render?size=${k}&v=${v}`} download>{label}</a>
            ))}
          </div>
        </>
      )}

      {isAdmin && (
        <div className={styles.btnRow} style={{ marginTop: 16 }}>
          <span className={styles.small}>全站默认每场上限</span>
          <input className={styles.input} style={{ width: 80 }} inputMode="numeric" value={dcap} onChange={(e) => setDcap(e.target.value.replace(/\D/g, ''))} />
          <button className={`${styles.btn} ${styles.btnQuiet}`} disabled={!!busy} onClick={() => post('default_cap', { value: dcap }, 'dcap', '默认上限已更新')}>保存</button>
        </div>
      )}

      {st.gens.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary className={styles.small} style={{ cursor: 'pointer' }}>生成记录（{st.gens.length} 条，含所用指令和花费）</summary>
          <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
          <table className={styles.table}>
            <thead><tr><th>时间</th><th>类型</th><th>服务</th><th>花费</th><th>结果</th><th>指令</th></tr></thead>
            <tbody>
              {st.gens.map((g) => (
                <tr key={g.id}>
                  <td className={styles.small}>{new Date(g.created_at).toLocaleString('zh-CN')}</td>
                  <td className={styles.small}>{g.kind === 'image' ? '主视觉' : '文案'}</td>
                  <td className={styles.small}>{g.provider}{g.model ? ` · ${g.model}` : ''}</td>
                  <td className={styles.small}>${g.cost_usd}</td>
                  <td className={styles.small}>{g.status === 'ok' ? '成功' : `失败：${g.error ?? ''}`}</td>
                  <td className={styles.small} style={{ maxWidth: 360, wordBreak: 'break-word' }}>{g.prompt.slice(0, 160)}{g.prompt.length > 160 ? '…' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
      )}
    </div>
  );
}
