'use client';
/**
 * /zh/jobs/post：发布活儿（藏蓝）。
 * 第一屏 5 项：我是 / 什么活（从工种进来预选）/ 城市 / 说说情况（打字或语音、可拍照）/ 什么时候要。
 * 手机号用已验证的自动带出；折叠"补充更多（选填）"：预算范围、房屋类型、称呼、微信号。
 * 施工队（招工人）多三项；"退租整修"一键预选清洁、维修、油漆、庭院，可增减，按工种拆成几条；装修、加建类多一个"想先找人看现场"。
 * 每个工种发成一条活儿（服务器按工种拆单），分别通知对口的人。
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api, useDraft } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell, PhoneCheck, Pick } from './shared';
import { BUDGETS, DURATIONS, HEADCOUNTS } from './labels';
import { PhotoPicker } from './PhotoPicker';
import { VoiceButton } from './VoiceButton';
import type { Meta, PosterRole, Timing } from './types';

type Draft = {
  role: PosterRole | '';
  trades: string[];
  city: string;
  text: string;
  photos: string[];
  voiceUrl: string | null;
  timing: Timing | '';
  budget: string;
  propertyType: string;
  callName: string;
  wechat: string;
  headcount: string;
  duration: string;
  pay: string;
  siteVisit: boolean;
  turnover: boolean;
};
const EMPTY: Draft = { role: '', trades: [], city: '', text: '', photos: [], voiceUrl: null, timing: '', budget: '', propertyType: '', callName: '', wechat: '', headcount: '', duration: '', pay: '', siteVisit: false, turnover: false };

export function PostForm() {
  return (
    <JobsShell side="find" need="find" eyebrow="找工人／施工队" title="发布活儿">
      {(meta) => <Form meta={meta} />}
    </JobsShell>
  );
}

function Form({ meta }: { meta: Meta }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pre = sp.get('trade');
  const [d, setD, clear] = useDraft<Draft>('jobs-post', EMPTY);
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cityOther, setCityOther] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  // 能发活儿的工种：开放、不是"只展示"（地产律师等）；工作人员预览时没开放的也能选
  const postable = useMemo(() => meta.trades.filter((t) => (t.open || meta.staffPreview) && !t.noPost), [meta]);
  const allCities = meta.options.cityGroups.flatMap((g) => g.cities);
  const turnoverKeys = meta.options.turnoverTrades.filter((k) => postable.some((t) => t.key === k));

  // 从工种进来：预选这个工种
  useEffect(() => {
    if (pre && postable.some((t) => t.key === pre)) setD((x) => (x.trades.includes(pre) ? x : { ...x, trades: [...x.trades, pre] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pre, postable.length]);
  useEffect(() => { if (d.city && !allCities.includes(d.city)) setCityOther(true); }, [d.city, allCities]);

  const groupsOrder = [...meta.groups].sort((a, b) => a.order - b.order);
  const crew = d.role === 'crew';
  const showSiteVisit = d.trades.some((k) => meta.options.siteVisitTrades.includes(k));
  const hasStory = d.text.trim().length > 0 || d.photos.length > 0 || !!d.voiceUrl;
  const missing = [
    !d.role && '我是',
    d.trades.length === 0 && '什么活',
    !d.city.trim() && '在哪个城市',
    !hasStory && '说说情况',
    !d.timing && '什么时候要',
    crew && !d.headcount && '要几个人',
    crew && !d.duration && '干多久',
    !phone && '验证手机号'
  ].filter(Boolean) as string[];

  function toggleTurnover() {
    if (d.turnover) return set({ turnover: false });
    set({ turnover: true, trades: Array.from(new Set([...d.trades, ...turnoverKeys])), text: d.text || '退租整修：' });
  }

  async function submit() {
    if (missing.length) {
      setErr(`还差：${missing.join('、')}`);
      return;
    }
    setBusy(true);
    setErr(null);
    const r = await api<{ ids: string[]; next: string }>('/api/v1/jobs/posts', {
      body: {
        posterRole: d.role,
        trades: d.trades,
        city: d.city.trim(),
        description: d.text.trim(),
        photos: d.photos,
        voiceUrl: d.voiceUrl,
        timing: d.timing,
        budget: d.budget || null,
        propertyType: d.propertyType || null,
        callName: d.callName.trim() || null,
        wechat: d.wechat.trim() || null,
        crewHeadcount: crew ? Number(d.headcount) || null : null,
        crewDuration: crew ? d.duration || null : null,
        crewPay: crew ? d.pay.trim() || null : null,
        wantSiteVisit: showSiteVisit ? d.siteVisit : false,
        turnover: d.turnover
      }
    });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    clear();
    try { sessionStorage.setItem('sarec:jobs-post-next', r.data.next); } catch { /* ignore */ }
    router.push(`/zh/jobs/post/done?ids=${r.data.ids.join(',')}`);
  }

  return (
    <>
      <p className={s.muted}>填 5 项就能发。发布后，做这一行、在你城市的人会收到通知，主动联系你。</p>

      <div className={s.field}>
        <span className={s.label}>我是<span className={s.required}>*</span></span>
        <Pick options={meta.options.posterRoles.map((r) => ({ value: r.key, label: r.label }))} value={d.role ? [d.role] : []} onChange={(v) => set({ role: v[0] })} />
        {crew && <p className={s.small} style={{ margin: 0 }}>招工人的活儿只有登记了的工人能联系你。</p>}
      </div>

      <div className={s.field}>
        <span className={s.label}>什么活<span className={s.required}>*</span><span className={s.small}>（可以多选，每个工种发成一条）</span></span>
        {turnoverKeys.length > 0 && (
          <div className={j.opts} style={{ marginBottom: '0.2rem' }}>
            <button type="button" aria-pressed={d.turnover} className={`${j.opt} ${d.turnover ? j.optOn : ''}`} onClick={toggleTurnover}>
              {d.turnover ? '✓ ' : ''}退租整修（清洁、维修、油漆、庭院）
            </button>
          </div>
        )}
        {d.turnover && <p className={s.small} style={{ margin: 0 }}>已帮你选好，可以再加减。每个工种拆成一条活儿，分别找对口的人。</p>}
        {groupsOrder.map((g) => {
          const ts = postable.filter((t) => t.group === g.key);
          if (!ts.length) return null;
          return (
            <div key={g.key}>
              <p className={s.small} style={{ margin: '0.6rem 0 0.3rem' }}>{g.name}</p>
              <Pick multi options={ts.map((t) => ({ value: t.key, label: t.name }))} value={d.trades} onChange={(v) => set({ trades: v })} />
            </div>
          );
        })}
      </div>

      {showSiteVisit && (
        <label className={s.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
          <input type="checkbox" checked={d.siteVisit} onChange={(e) => set({ siteVisit: e.target.checked })} />
          想先找人看现场
        </label>
      )}

      <div className={s.field}>
        <span className={s.label}>在哪个城市<span className={s.required}>*</span></span>
        {meta.options.cityGroups.map((g) => (
          <div key={g.region}>
            <p className={s.small} style={{ margin: '0.4rem 0 0.3rem' }}>{g.region}</p>
            <div className={j.opts}>
              {g.cities.map((c) => (
                <button key={c} type="button" className={`${j.opt} ${d.city === c && !cityOther ? j.optOn : ''}`} onClick={() => { setCityOther(false); set({ city: c }); }}>{c}</button>
              ))}
            </div>
          </div>
        ))}
        <div className={j.opts} style={{ marginTop: '0.4rem' }}>
          <button type="button" className={`${j.opt} ${cityOther ? j.optOn : ''}`} onClick={() => { setCityOther(true); set({ city: '' }); }}>别的城市（自己写）</button>
        </div>
        {cityOther && <input className={s.input} placeholder="城市名，例如 Fullerton" value={d.city} onChange={(e) => set({ city: e.target.value })} />}
        <p className={s.small} style={{ margin: 0 }}>只写城市，完整地址不公开，等对方联系你时再说。</p>
      </div>

      <div className={s.field}>
        <label className={s.label} htmlFor="jp-text">说说情况<span className={s.required}>*</span><span className={s.small}>（打字、说一段语音或拍张照片都行）</span></label>
        <textarea id="jp-text" className={s.textarea} placeholder="例如：厨房水龙头漏水，想换一个新的；周末在家" value={d.text} onChange={(e) => set({ text: e.target.value })} />
        <VoiceButton url={d.voiceUrl} onChange={(voiceUrl) => set({ voiceUrl })} />
        <PhotoPicker photos={d.photos} max={9} onChange={(photos) => set({ photos })} />
      </div>

      <div className={s.field}>
        <span className={s.label}>什么时候要<span className={s.required}>*</span></span>
        <Pick options={meta.options.timings.map((x) => ({ value: x.key, label: x.label }))} value={d.timing ? [d.timing] : []} onChange={(v) => set({ timing: v[0] })} />
      </div>

      {crew && (
        <div className={s.card}>
          <p className={s.cardTitle}>招工人</p>
          <div className={s.field}><span className={s.label}>要几个人<span className={s.required}>*</span></span><Pick options={HEADCOUNTS.map((x) => ({ value: x.key, label: x.label }))} value={d.headcount ? [d.headcount] : []} onChange={(v) => set({ headcount: v[0] })} /></div>
          <div className={s.field}><span className={s.label}>干多久<span className={s.required}>*</span></span><Pick options={DURATIONS.map((x) => ({ value: x, label: x }))} value={d.duration ? [d.duration] : []} onChange={(v) => set({ duration: v[0] })} /></div>
          <div className={s.field}>
            <label className={s.label} htmlFor="jp-pay">日薪或时薪（选填）</label>
            <input id="jp-pay" className={s.input} placeholder="例如：日薪 $200 / 时薪 $25" value={d.pay} onChange={(e) => set({ pay: e.target.value })} />
          </div>
        </div>
      )}

      <div className={s.field}>
        <span className={s.label}>联系电话<span className={s.required}>*</span></span>
        <PhoneCheck why="发布前请先登录（用手机号收验证码最方便，电话会自动带出）。填的内容不会丢。" onPhone={setPhone} />
        <p className={s.small} style={{ margin: 0 }}>只有有资格的人点了“联系发布人”才看得到，系统会记下谁看过。</p>
      </div>

      <details className={j.fold}>
        <summary>补充更多（选填）</summary>
        <div className={s.field}><span className={s.label}>预算范围</span><Pick options={BUDGETS.map((x) => ({ value: x, label: x }))} value={d.budget ? [d.budget] : []} onChange={(v) => set({ budget: v[0] === d.budget ? '' : v[0] })} /></div>
        <div className={s.field}><span className={s.label}>房屋类型</span><Pick options={meta.options.propertyTypes.map((x) => ({ value: x.key, label: x.label }))} value={d.propertyType ? [d.propertyType] : []} onChange={(v) => set({ propertyType: v[0] === d.propertyType ? '' : v[0] })} /></div>
        <div className={s.field}>
          <label className={s.label} htmlFor="jp-nick">称呼</label>
          <input id="jp-nick" className={s.input} placeholder="例如：王先生" value={d.callName} onChange={(e) => set({ callName: e.target.value })} />
        </div>
        <div className={s.field}>
          <label className={s.label} htmlFor="jp-wx">微信号</label>
          <input id="jp-wx" className={s.input} value={d.wechat} onChange={(e) => set({ wechat: e.target.value })} />
        </div>
      </details>

      {err && <div className={s.error}>{err}</div>}
      <BottomBar>
        <button type="button" className={`${s.btn} ${j.btnFind}`} disabled={busy} onClick={submit}>
          {busy ? '正在发布…' : missing.length ? `发布活儿（还差 ${missing.length} 项）` : d.trades.length > 1 ? `发布活儿（拆成 ${d.trades.length} 条）` : '发布活儿'}
        </button>
      </BottomBar>
    </>
  );
}
