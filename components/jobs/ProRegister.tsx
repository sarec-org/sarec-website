'use client';
/**
 * /zh/jobs/register?role=company|licensed|pro_service|worker：登记接活儿（金色）。
 * 指令 9 · D27：不再有单独的“选身份”一步——从「我要接活儿」的四个身份方块点进来身份已选好（没带 role 默认施工队或公司），
 * 表单顶上四个身份切换条，点了下面的项当场变（原始指令三.3）；现有会员资料自动带入；勾选同意规则。
 * 提交后服务器定状态、加州承包商牌照自动查；核验通过但不是会员的，引导去交会费（核验不过不收钱）。工人免费。
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, useDraft } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import { ROLE_SUB, roleForTrade } from './JobsHome';
import j from './jobs.module.css';
import { BottomBar, JobsShell, NeedLogin, PhoneCheck, Pick } from './shared';
import { PRO_ROLE_HINT, TEAM_SIZES, YEARS } from './labels';
import { PhotoPicker } from './PhotoPicker';
import { focusAllows, focusChoice, focusIntro, focusPickFor, tradeFocus, type FocusChoice, type TradeFocus } from './tradeFocus';
import type { Meta, MeProRes, ProRole, ProSelf } from './types';

export type ProForm = {
  role: ProRole | '';
  name: string;
  avatar: string;
  trades: string[];
  cities: string[];
  years: string;
  languages: string[];
  availableNow: boolean;
  licenseNo: string;
  businessRegUrl: string;
  insuranceUrl: string;
  licenseDocUrl: string;
  intro: string;
  photos: string[];
  teamSize: string;
  wechat: string;
  designNoCaStamp: boolean;
  agree: boolean;
};
const EMPTY_PRO: ProForm = { role: '', name: '', avatar: '', trades: [], cities: [], years: '', languages: [], availableNow: true, licenseNo: '', businessRegUrl: '', insuranceUrl: '', licenseDocUrl: '', intro: '', photos: [], teamSize: '', wechat: '', designNoCaStamp: false, agree: false };

const nearest = (n: number | null, list: { key: string }[]) => (n == null ? '' : list.reduce((a, b) => (Math.abs(Number(b.key) - n) < Math.abs(Number(a.key) - n) ? b : a)).key);

const ROLE_KEYS: ProRole[] = ['company', 'licensed', 'pro_service', 'worker'];
export const isProRole = (x: unknown): x is ProRole => typeof x === 'string' && (ROLE_KEYS as string[]).includes(x);

function startFrom(res: MeProRes): ProForm {
  const p = res.pro;
  const f = res.prefill;
  if (p) {
    return {
      ...EMPTY_PRO, role: p.role, name: p.name, avatar: p.avatar ?? '', trades: p.trades, cities: p.cities, years: nearest(p.years, YEARS), languages: p.languages,
      availableNow: p.availableNow, licenseNo: p.licenseNo ?? '', businessRegUrl: p.businessRegUrl ?? '', insuranceUrl: p.insuranceUrl ?? '', licenseDocUrl: p.licenseDocUrl ?? '',
      intro: p.intro ?? '', photos: p.photos, teamSize: nearest(p.teamSize, TEAM_SIZES), wechat: p.wechat ?? '', designNoCaStamp: p.designNoCaStamp
    };
  }
  return { ...EMPTY_PRO, role: f.role ?? 'company', name: f.name, avatar: f.avatar ?? '', trades: f.trades, cities: f.cities, intro: f.intro ?? '', wechat: f.wechat ?? '' };
}

export function ProRegister() {
  const sp = useSearchParams();
  const urlTrade = sp.get('trade');
  const urlGroup = sp.get('group');
  // 指令 31：从工种方块进来，标题写成「登记接活儿 · 家政保洁」
  const title = (meta: Meta) => {
    const fc = urlTrade ? tradeFocus(meta, urlTrade, urlGroup) : null;
    return fc ? `登记接活儿 · ${fc.label}` : '登记接活儿';
  };
  return (
    <JobsShell side="work" need="work" eyebrow="我要接活儿" title={title}>
      {(meta) => <Loader meta={meta} />}
    </JobsShell>
  );
}

function Loader({ meta }: { meta: Meta }) {
  const sp = useSearchParams();
  const urlRole = sp.get('role');
  // 指令 29：从接活儿一侧的工种方块点进来（?trade=）→ 这个工种已选好，身份按工种给默认（?role= 优先）
  const urlTrade = sp.get('trade');
  const urlGroup = sp.get('group');
  const [res, setRes] = useState<MeProRes | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<MeProRes>('/api/v1/jobs/me/pro');
    if (!r.ok) return r.status === 401 ? setNeedLogin(true) : setErr(r.message);
    setNeedLogin(false);
    setRes(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);
  if (needLogin) return <NeedLogin why="先登录（用邮箱或手机收验证码，不用密码）。你在商会已有的资料会自动带进来。" onDone={load} />;
  if (err) return <div className={s.error}>{err} <button className={j.linkBtn} onClick={load}>再试一次</button></div>;
  if (!res) return <p className={s.muted}>正在加载…</p>;
  if (res.pro && res.pro.status !== 'draft') {
    return (
      <div className={s.notice}>
        你已经登记过了（{res.pro.statusLabel}）。改资料、看核验状态请去「我的接活儿」。
        <div style={{ marginTop: '0.6rem' }}><Link href="/zh/jobs/mine" className={`${s.btn} ${j.btnWork}`}>我的接活儿</Link></div>
      </div>
    );
  }
  const trade = urlTrade && meta.trades.some((t) => t.key === urlTrade && (t.open || meta.staffPreview)) ? urlTrade : null;
  // 指令 31：带工种进来＝这个工种的登记页；身份只在对这个工种说得通的里面选（上次草稿 / 会员资料的身份说得通就用，否则用这个工种的默认）
  const focus = trade ? tradeFocus(meta, trade, urlGroup) : null;
  if (focus) {
    // 指令 33：按钮（key）和提交的身份（role）分开——设计等几组两个按钮都提交「设计与专业服务」
    const c0 = [urlRole, res.pro?.role, res.prefill.role].map((r) => focusPickFor(focus, r)).find(Boolean) ?? focusChoice(focus, focus.def)!;
    return <ProFormView meta={meta} res={res} initialRole={c0.role} initialTrade={trade} focus={focus} initialPick={c0.key} />;
  }
  const tradeRole = trade ? roleForTrade(meta, trade) : '';
  const role = isProRole(urlRole) ? urlRole : isProRole(tradeRole) ? tradeRole : null;
  return <ProFormView meta={meta} res={res} initialRole={role} initialTrade={trade} />;
}

export function ProFormView({ meta, res, editing, onSaved, initialRole, initialTrade, focus, initialPick }: { meta: Meta; res: MeProRes; editing?: boolean; onSaved?: (p: ProSelf) => void; initialRole?: ProRole | null; initialTrade?: string | null; focus?: TradeFocus | null; initialPick?: string }) {
  const [f, setF, clear] = useDraft<ProForm>(editing ? 'jobs-pro-edit' : 'jobs-pro', startFrom(res));
  // D27：从身份方块点进来（?role=）→ 身份已选好；草稿里是别的身份也以点的为准。没有身份时默认施工队或公司。
  useEffect(() => {
    // V15-1：从工种方块点进来（?trade=）只选这一个工种，不合并草稿里上次没提交的工种（姓名、城市等照样带）
    if (initialRole && !editing) setF((x) => (initialTrade ? { ...x, role: initialRole, trades: [initialTrade] } : x.role === initialRole ? x : { ...x, role: initialRole, trades: [] }));
    else setF((x) => (x.role ? x : { ...x, role: 'company' }));
  }, [initialRole, initialTrade, editing, setF]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ pro: ProSelf; autoCheck: { message?: string } | null } | null>(null);
  const [, setPhone] = useState<string | null>(null);
  const set = (p: Partial<ProForm>) => setF((x) => ({ ...x, ...p }));
  const licensed = f.role === 'company' || f.role === 'licensed';
  const proService = f.role === 'pro_service';
  // 指令 31：按工种进来（focus）时只列这一组，点「我还能做别的工种 ›」才列全部
  const fc = editing ? null : focus ?? null;
  const [more, setMore] = useState(false);
  // 指令 33：按工种进来时点的是哪个按钮（设计等几组两个按钮背后都是 pro_service，靠它分名称一栏的叫法）
  const [pick, setPick] = useState(initialPick ?? '');
  const choice = fc ? focusChoice(fc, pick) : null;

  // 身份决定能选哪些工种：施工队 / 持牌师傅 = 要执照的（A、B 类）；设计与专业服务 = B、C 类；工人 = 全部
  const tradeOpts = useMemo(() => {
    const ok = (t: Meta['trades'][number]) =>
      (t.open || meta.staffPreview) && (fc ? focusAllows(f.role, t.licType) : f.role === 'worker' ? true : licensed ? t.licType !== 'C' : proService ? t.licType !== 'A' : true);
    const all = [...meta.groups].sort((a, b) => a.order - b.order).map((g) => ({ g, ts: meta.trades.filter((t) => t.group === g.key && ok(t)) })).filter((x) => x.ts.length);
    if (!fc) return all;
    const mine = all.filter((x) => x.g.key === fc.group);
    return more ? [...mine, ...all.filter((x) => x.g.key !== fc.group)] : mine;
  }, [meta, f.role, licensed, proService, fc, more]);
  const picked = meta.trades.filter((t) => f.trades.includes(t.key));
  const needLic = licensed || (proService && picked.some((t) => t.licType !== 'C'));
  // 指令 31：按工种进来时牌照 / 执照号只在要的时候出；没出的不算、不提交（不让上次草稿里看不见的号码顶掉营业登记）
  const licVal = fc && !needLic ? '' : f.licenseNo.trim();
  const needBizReg = proService && picked.some((t) => t.licType === 'C') && !licVal;
  const cNames = picked.filter((t) => t.licType === 'C').map((t) => t.name).join('、');
  const team = choice ? choice.firm : f.role === 'company';
  const firmName = !fc ? '' : fc.pro ? fc.firmWord : f.role === 'company' ? (fc.licType === 'A' ? '公司或施工队' : '公司') : '公司或团队';
  // 换身份（按工种进来时）：选了的工种新身份还能选就留着，进来的那个工种还能选就照旧勾着
  const pickFocusRole = (c: FocusChoice) => {
    if (!fc || pick === c.key) return;
    setPick(c.key);
    const r = c.role;
    if (f.role === r) return;
    const keep = f.trades.filter((k) => { const t = meta.trades.find((x) => x.key === k); return !!t && focusAllows(r, t.licType); });
    set({ role: r, trades: keep.length ? keep : focusAllows(r, fc.licType) ? [fc.trade] : [] });
  };
  // 要换别的身份：去掉 URL 里的工种，回到完整的登记页（和「登记接活儿」大按钮进来的一样），已填的不丢
  const openFull = () => {
    const u = new URL(window.location.href);
    u.searchParams.delete('trade');
    u.searchParams.delete('group');
    if (f.role) u.searchParams.set('role', f.role);
    window.history.replaceState(null, '', u.toString());
  };
  const showStampNote = proService && picked.some((t) => t.group === 'design');

  const missing = [
    !f.role && '身份',
    !f.name.trim() && '名称或姓名',
    f.trades.length === 0 && '能做的工种',
    f.cities.length === 0 && '服务城市',
    !f.years && '干了几年',
    needLic && !licVal && (fc ? (licensed && picked.some((t) => t.licType === 'A') ? '牌照号' : '执照号') : '牌照号'),
    needBizReg && !f.businessRegUrl && '营业登记',
    !f.agree && '勾选同意规则'
  ].filter(Boolean) as string[];

  async function submit() {
    if (missing.length) return setErr(`还差：${missing.join('、')}`);
    setBusy(true);
    setErr(null);
    const worker = f.role === 'worker';
    const r = await api<{ pro: ProSelf; autoCheck: { message?: string } | null }>('/api/v1/jobs/me/pro', {
      body: {
        role: f.role, name: f.name.trim(), avatar: f.avatar || null, trades: f.trades, cities: f.cities, years: Number(f.years) || null,
        languages: f.languages, availableNow: f.availableNow, licenseNo: worker ? null : licVal || null,
        businessRegUrl: worker ? null : f.businessRegUrl || null, insuranceUrl: worker ? null : f.insuranceUrl || null, licenseDocUrl: worker ? null : f.licenseDocUrl || null,
        intro: f.intro.trim() || null, photos: f.photos, teamSize: licensed ? Number(f.teamSize) || null : null, wechat: f.wechat.trim() || null,
        designNoCaStamp: proService && f.designNoCaStamp, agree: f.agree
      }
    });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    clear();
    setDone(r.data);
    onSaved?.(r.data.pro);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (done) return <AfterSubmit pro={done.pro} meta={meta} autoMsg={done.autoCheck?.message ?? null} />;

  const docUpload = (label: string, kind: string, val: string, key: 'businessRegUrl' | 'insuranceUrl' | 'licenseDocUrl', must?: boolean) => (
    <div className={s.field}>
      <span className={s.label}>{label}{must && <span className={s.required}>*</span>}</span>
      <PhotoPicker photos={val ? [val] : []} max={1} label="拍照 / 上传" endpoint={`/api/v1/jobs/me/pro/photo?kind=${kind}`} hint={must ? '拍清楚证件上的名字和号码。' : '选填，拍清楚就行。'} onChange={(p) => set({ [key]: p[0] ?? '' } as Partial<ProForm>)} />
    </div>
  );

  return (
    <>
      {!editing && !fc && <p className={s.muted}>登记一次，有对口的活儿第一时间通知你。你在商会已有的资料已经带进来了，看一眼对不对就行。</p>}
      {fc && <p className={s.muted}>{focusIntro(fc, f.role, choice)}</p>}
      {res.pro?.status === 'returned' && res.pro.returnReason && <div className={s.error}>上次被退回：{res.pro.returnReason}。改好再提交一次就行。</div>}

      {/* 指令 31：按工种进来——身份只出对这个工种说得通的（只剩一个就整排不出） */}
      {fc && fc.choices.length > 1 && (
        <div className={s.field}>
          <div className={j.roleTiles} role="tablist" aria-label="身份" style={{ marginTop: '0.3rem' }}>
            {fc.choices.map((c) => (
              <button key={c.key} type="button" role="tab" aria-selected={pick === c.key} className={`${j.roleTile} ${pick === c.key ? j.roleTabOn : ''}`} onClick={() => pickFocusRole(c)}>
                {c.label}
                {c.sub && <small style={pick === c.key ? { color: 'inherit' } : undefined}>{c.sub}</small>}
              </button>
            ))}
          </div>
          {fc.helper && (
            <button type="button" className={j.linkBtn} style={{ marginTop: '0.4rem', fontWeight: pick === fc.helper.key ? 700 : 400 }} aria-pressed={pick === fc.helper.key} onClick={() => pickFocusRole(fc.helper!)}>
              {pick === fc.helper.key ? '✓ ' : ''}{fc.helper.label} ›
            </button>
          )}
        </div>
      )}

      {/* D27：四个身份切换条（点了下面的项当场变，不再有单独的选身份页） */}
      {!fc && <div className={s.field}>
        <span className={s.label}>我是<span className={s.required}>*</span></span>
        {/* 指令 29：四个身份方块从「我要接活儿」首页挪到这里（选中的金底） */}
        <div className={j.roleTiles} role="tablist" aria-label="身份" style={{ marginTop: '0.3rem' }}>
          {meta.options.proRoles.map((r) => (
            <button key={r.key} type="button" role="tab" aria-selected={f.role === r.key} className={`${j.roleTile} ${f.role === r.key ? j.roleTabOn : ''}`}
              onClick={() => {
                if (f.role === r.key) return;
                set({ role: r.key, trades: [] });
                if (!editing && typeof window !== 'undefined') {
                  const u = new URL(window.location.href);
                  u.searchParams.set('role', r.key);
                  window.history.replaceState(null, '', u.toString());
                }
              }}>
              {r.label}
              <small style={f.role === r.key ? { color: 'inherit' } : undefined}>{ROLE_SUB[r.key] ?? ''}</small>
            </button>
          ))}
        </div>
        {f.role && <p className={s.small} style={{ margin: '0.4rem 0 0' }}>{PRO_ROLE_HINT[f.role]}</p>}
      </div>}

      {f.role && (
        <>
          <div className={s.field}>
            <label className={s.label} htmlFor="pr-name">{fc ? (team ? `${firmName}名称` : '姓名') : f.role === 'worker' || f.role === 'licensed' ? '姓名' : '名称（公司、施工队或事务所名）'}<span className={s.required}>*</span></label>
            <input id="pr-name" className={s.input} value={f.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className={s.field}>
            <span className={s.label}>头像（选填）</span>
            <PhotoPicker photos={f.avatar ? [f.avatar] : []} max={1} label="换头像" endpoint="/api/v1/jobs/me/pro/photo?kind=avatar" hint="用本人照片或公司标志。" onChange={(p) => set({ avatar: p[0] ?? '' })} />
          </div>
          <div className={s.field}>
            <span className={s.label}>能做的工种<span className={s.required}>*</span><span className={s.small}>（可以多选）</span></span>
            {tradeOpts.length === 0 && <p className={s.muted}>这个身份暂时没有开放的工种。</p>}
            {tradeOpts.map(({ g, ts }) => (
              <div key={g.key}>
                <p className={s.small} style={{ margin: '0.5rem 0 0.3rem' }}>{g.name}</p>
                <Pick multi options={ts.map((t) => ({ value: t.key, label: t.name }))} value={f.trades} onChange={(v) => set({ trades: v })} />
              </div>
            ))}
            {/* 指令 33：要执照的那页，同组里不需要州执照的细项（设计组的室内设计、房屋检查等）如实说一句 */}
            {fc?.noLicNote && proService && <p className={s.small} style={{ margin: '0.4rem 0 0' }}>{fc.noLicNote}</p>}
            {/* 指令 31：不把人困死在一个工种里 */}
            {fc && !more && <button type="button" className={j.linkBtn} style={{ marginTop: '0.5rem', color: 'var(--muted, #5B6B7F)' }} onClick={() => setMore(true)}>我还能做别的工种 ›</button>}
            {fc && more && <button type="button" className={j.linkBtn} style={{ marginTop: '0.5rem', color: 'var(--muted, #5B6B7F)' }} onClick={openFull}>要换别的身份？看完整的登记选项 ›</button>}
          </div>
          <div className={s.field}>
            <span className={s.label}>服务城市<span className={s.required}>*</span><span className={s.small}>（可以多选）</span></span>
            {meta.cities.map((g) => (
              <div key={g.region}>
                <p className={s.small} style={{ margin: '0.5rem 0 0.3rem' }}>{g.region}</p>
                <Pick multi options={g.items.map((c) => ({ value: c.key, label: c.name }))} value={f.cities} onChange={(v) => set({ cities: v })} />
              </div>
            ))}
            <p className={s.small}>列表里没有你的城市？请联系商会工作人员添加。</p>
          </div>
          <div className={s.field}>
            <span className={s.label}>干了几年<span className={s.required}>*</span></span>
            <Pick options={YEARS.map((x) => ({ value: x.key, label: x.label }))} value={f.years ? [f.years] : []} onChange={(v) => set({ years: v[0] })} />
          </div>
          <div className={s.field}>
            <span className={s.label}>会说的语言（选填）</span>
            <Pick multi options={meta.options.languages.map((x) => ({ value: x, label: x }))} value={f.languages} onChange={(v) => set({ languages: v })} />
          </div>
          <div className={j.toggleRow}>
            <span>现在有空<br /><span className={s.small}>打开后，名字旁边显示“现在有空”</span></span>
            <button type="button" role="switch" aria-checked={f.availableNow} className={`${j.switch} ${f.availableNow ? j.switchOn : ''}`} onClick={() => set({ availableNow: !f.availableNow })} aria-label="现在有空" />
          </div>

          {(licensed || proService) && (
            <div className={s.card} style={{ marginTop: '1rem' }}>
              {(fc ? needLic : needLic || proService) && (
                <div className={s.field}>
                  <label className={s.label} htmlFor="pr-lic">{fc?.kind === 'lic' && fc.licType === 'B' && picked.some((t) => t.key === fc.trade) ? fc.licName : licensed ? (fc && !picked.some((t) => t.licType === 'A') && picked.length ? '执照号' : '牌照号（加州承包商牌照或州执照）') : '执照号'}{needLic && <span className={s.required}>*</span>}</label>
                  <input id="pr-lic" className={s.input} value={f.licenseNo} onChange={(e) => set({ licenseNo: e.target.value })} />
                  <p className={s.small} style={{ margin: 0 }}>
                    {licensed ? '提交后系统自动对照加州承包商执照局（CSLB）官方名单：状态、类别、工伤保险、保证金。' : needLic ? '工作人员会到发证机构官网核对。' : '你选的工种不需要州执照，有执照也可以填。'}
                    需要执照的工种，没有执照一律不能接。
                  </p>
                </div>
              )}
              {needLic && !licensed && docUpload('执照照片（选填）', 'license', f.licenseDocUrl, 'licenseDocUrl')}
              {proService && picked.some((t) => t.licType === 'C') && docUpload('营业登记（Business License）', 'bizreg', f.businessRegUrl, 'businessRegUrl', needBizReg)}
              {fc && proService && cNames && <p className={s.small} style={{ marginTop: '-0.4rem' }}>{fc.kind === 'nolic' ? '交一张营业登记就行：公司交州里的登记，个人交市或县的营业登记、DBA 都可以。' : `${cNames}不需要州执照，交一张营业登记就行：公司交州里的登记，个人交市或县的营业执照、DBA 都可以。`}</p>}
              {proService && docUpload('责任保险（选填）', 'insurance', f.insuranceUrl, 'insuranceUrl')}
              {showStampNote && (
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', minHeight: 44 }}>
                  <input type="checkbox" checked={f.designNoCaStamp} onChange={(e) => set({ designNoCaStamp: e.target.checked })} />
                  没有加州执照，只做方案与咨询（不提供加州报批签章）
                </label>
              )}
              <div className={s.field}>
                <label className={s.label} htmlFor="pr-intro">一句话介绍</label>
                <input id="pr-intro" className={s.input} placeholder={fc ? `例如：专做${fc.tradeName}，十年经验` : '例如：专做厨卫翻新，十五年经验'} value={f.intro} onChange={(e) => set({ intro: e.target.value })} />
              </div>
              <div className={s.field}>
                <span className={s.label}>{proService && fc?.kind !== 'nolic' ? '案例图' : '活儿照片'}（最多 9 张，选填）</span>
                <PhotoPicker photos={f.photos} max={9} endpoint="/api/v1/jobs/me/pro/photo?kind=work" onChange={(p) => set({ photos: p })} />
              </div>
              {licensed && (
                <>
                  <div className={s.field}>
                    <span className={s.label}>团队人数（选填）</span>
                    <Pick options={TEAM_SIZES.map((x) => ({ value: x.key, label: x.label }))} value={f.teamSize ? [f.teamSize] : []} onChange={(v) => set({ teamSize: v[0] === f.teamSize ? '' : v[0] })} />
                  </div>
                  {docUpload('保险资料（选填）', 'insurance', f.insuranceUrl, 'insuranceUrl')}
                </>
              )}
            </div>
          )}
          {f.role === 'worker' && (
            <div className={s.card} style={{ marginTop: '1rem' }}>
              <p className={s.small} style={{ marginTop: 0 }}>{fc?.kind === 'nolic' ? `免费登记，不用交资料。能联系商会网站上招${fc.label}帮手的活儿；房主直接发的活儿，要选「我有团队或公司」、交营业登记后才能接。` : '工人免费登记，不用填牌照。工人能联系施工队发的招工；房主、房东等发的活儿要有执照的人才能接。'}</p>
              <div className={s.field}>
                <label className={s.label} htmlFor="pr-intro2">一句话介绍（选填）</label>
                <input id="pr-intro2" className={s.input} value={f.intro} onChange={(e) => set({ intro: e.target.value })} />
              </div>
              <div className={s.field}>
                <span className={s.label}>照片（选填）</span>
                <PhotoPicker photos={f.photos} max={9} endpoint="/api/v1/jobs/me/pro/photo?kind=work" onChange={(p) => set({ photos: p })} />
              </div>
            </div>
          )}

          <div className={s.field} style={{ marginTop: '1rem' }}>
            <span className={s.label}>手机号<span className={s.required}>*</span></span>
            <PhoneCheck why="先登录。" onPhone={setPhone} />
            <p className={s.small} style={{ margin: 0 }}>找工人的人点“联系”才看得到，系统会记下谁看过。</p>
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="pr-wx">微信号（选填）</label>
            <input id="pr-wx" className={s.input} value={f.wechat} onChange={(e) => set({ wechat: e.target.value })} />
          </div>

          {f.role !== 'worker' && meta.switches.requirePaid && (
            <p className={s.small}>上列表、看发布人电话的条件：先核验通过，再是缴费会员。核验不过不收钱。</p>
          )}
          {f.role !== 'worker' && meta.switches.feeMode === 'free_quota' && (
            <p className={s.small}>核验通过就上找工人列表；可以免费联系 {meta.switches.freeContacts ?? 2} 位发布人，用完后成为商会会员可以继续。会员不限。</p>
          )}

          <div className={s.card}>
            <p className={s.cardTitle}>接活儿规则</p>
            <ul className={j.steps}>
              {/* 指令 31 补：不要执照的工种（家政保洁等）这一页，规则第一条「只在自己的执照范围内接活儿」换个说法；只换显示的字，提交不变（规则是服务器给的，在这里换这一行） */}
              {(res.rules.length ? res.rules : meta.rules).map((r) => (fc?.kind === 'nolic' && /执照范围/.test(r) ? `只接自己会做、做得好的活儿${/。$/.test(r) ? '。' : ''}` : r)).map((r) => <li key={r}>{r}</li>)}
            </ul>
            <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', minHeight: 44 }}>
              <input type="checkbox" checked={f.agree} onChange={(e) => set({ agree: e.target.checked })} />
              我同意以上规则
            </label>
          </div>
        </>
      )}

      {err && <div className={s.error}>{err}</div>}
      <BottomBar>
        <button type="button" className={`${s.btn} ${j.btnWork}`} disabled={busy || !f.role} onClick={submit}>
          {busy ? '正在提交…' : !f.role ? '先选身份' : missing.length ? `${editing ? '保存' : '提交登记'}（还差 ${missing.length} 项）` : editing ? '保存' : '提交登记'}
        </button>
      </BottomBar>
    </>
  );
}

/** 提交后：说清现在是什么状态、下一步干什么 */
export function AfterSubmit({ pro, meta, autoMsg }: { pro: ProSelf; meta: Meta; autoMsg: string | null }) {
  const verified = pro.status === 'verified';
  const needPay = verified && pro.needPay && meta.switches.requirePaid;
  return (
    <>
      {pro.status === 'pending' && <div className={s.success}>登记好了，正在核验。</div>}
      {verified && <div className={s.success}>{pro.role === 'worker' ? '登记好了。' : pro.needsReview ? '保存好了。新加的工种或换了的牌照，工作人员会再看一遍。' : '保存好了，核验通过。'}</div>}
      {pro.status === 'returned' && <div className={s.error}>没通过：{pro.returnReason ?? '资料对不上'}。改好再提交一次就行，不收任何钱。</div>}
      <ol className={j.steps}>
        {pro.status === 'pending' && <li>{autoMsg ? autoMsg.replace(/[。，,.\s]*$/, '。') : '牌照或执照核验通常 1–2 个工作日。'}结果会通知你。</li>}
        {needPay && <li><b>还差一步：成为缴费会员</b>，就能上列表、看发布人电话。</li>}
        {verified && !needPay && pro.role !== 'worker' && <li>你已经在找工人列表上了，有对口的活儿会第一时间通知你。</li>}
        {pro.role === 'worker' && <li>工人免费登记，能联系施工队发的招工；有对口的招工会通知你。</li>}
        <li>在「我的接活儿」里能改资料、看通知给你的活儿、看核验状态。</li>
      </ol>
      <div className={s.btnRow}>
        {needPay && <Link href="/zh/join" className={`${s.btn} ${j.btnWork}`}>去交会费</Link>}
        <Link href="/zh/jobs/mine" className={`${s.btn} ${s.btnGhost}`}>我的接活儿</Link>
        <Link href="/zh/jobs/posts" className={`${s.btn} ${s.btnQuiet}`}>看全部活儿</Link>
      </div>
    </>
  );
}
