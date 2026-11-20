'use client';
/**
 * /zh/jobs/register：登记接活（金色）。先选身份，字段跟着变（原始指令三.3）；现有会员资料自动带入；勾选同意规则。
 * 提交后服务器定状态、加州承包商牌照自动查；核验通过但不是会员的，引导去交会费（核验不过不收钱）。工人免费。
 */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, useDraft } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell, NeedLogin, PhoneCheck, Pick } from './shared';
import { PRO_ROLE_HINT, TEAM_SIZES, YEARS } from './labels';
import { PhotoPicker } from './PhotoPicker';
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
  return { ...EMPTY_PRO, role: f.role ?? '', name: f.name, avatar: f.avatar ?? '', trades: f.trades, cities: f.cities, intro: f.intro ?? '', wechat: f.wechat ?? '' };
}

export function ProRegister() {
  return (
    <JobsShell side="work" need="work" eyebrow="我要接活" title="登记接活">
      {(meta) => <Loader meta={meta} />}
    </JobsShell>
  );
}

function Loader({ meta }: { meta: Meta }) {
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
        你已经登记过了（{res.pro.statusLabel}）。改资料、看核验状态请去「我的接活」。
        <div style={{ marginTop: '0.6rem' }}><Link href="/zh/jobs/mine" className={`${s.btn} ${j.btnWork}`}>我的接活</Link></div>
      </div>
    );
  }
  return <ProFormView meta={meta} res={res} />;
}

export function ProFormView({ meta, res, editing, onSaved }: { meta: Meta; res: MeProRes; editing?: boolean; onSaved?: (p: ProSelf) => void }) {
  const [f, setF, clear] = useDraft<ProForm>(editing ? 'jobs-pro-edit' : 'jobs-pro', startFrom(res));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ pro: ProSelf; autoCheck: { message?: string } | null } | null>(null);
  const [, setPhone] = useState<string | null>(null);
  const set = (p: Partial<ProForm>) => setF((x) => ({ ...x, ...p }));
  const licensed = f.role === 'company' || f.role === 'licensed';
  const proService = f.role === 'pro_service';

  // 身份决定能选哪些工种：施工队 / 持牌师傅 = 要执照的（A、B 类）；设计与专业服务 = B、C 类；工人 = 全部
  const tradeOpts = useMemo(() => {
    const ok = (t: Meta['trades'][number]) =>
      (t.open || meta.staffPreview) && (f.role === 'worker' ? true : licensed ? t.licType !== 'C' : proService ? t.licType !== 'A' : true);
    return [...meta.groups].sort((a, b) => a.order - b.order).map((g) => ({ g, ts: meta.trades.filter((t) => t.group === g.key && ok(t)) })).filter((x) => x.ts.length);
  }, [meta, f.role, licensed, proService]);
  const picked = meta.trades.filter((t) => f.trades.includes(t.key));
  const needLic = licensed || (proService && picked.some((t) => t.licType !== 'C'));
  const needBizReg = proService && picked.some((t) => t.licType === 'C') && !f.licenseNo.trim();
  const showStampNote = proService && picked.some((t) => t.group === 'design');

  const missing = [
    !f.role && '身份',
    !f.name.trim() && '名称或姓名',
    f.trades.length === 0 && '能做的工种',
    f.cities.length === 0 && '服务城市',
    !f.years && '干了几年',
    needLic && !f.licenseNo.trim() && '牌照号',
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
        languages: f.languages, availableNow: f.availableNow, licenseNo: worker ? null : f.licenseNo.trim() || null,
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
      {!editing && <p className={s.muted}>登记一次，有对口的活儿第一时间通知你。你在商会已有的资料已经带进来了，看一眼对不对就行。</p>}
      {res.pro?.status === 'returned' && res.pro.returnReason && <div className={s.error}>上次被退回：{res.pro.returnReason}。改好再提交一次就行。</div>}

      <div className={s.field}>
        <span className={s.label}>先选身份<span className={s.required}>*</span></span>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {meta.options.proRoles.map((r) => (
            <button key={r.key} type="button" aria-pressed={f.role === r.key} className={`${j.opt} ${f.role === r.key ? j.optOn : ''}`} style={{ borderRadius: 8, textAlign: 'left', padding: '0.7rem 1rem' }} onClick={() => set({ role: r.key, trades: f.role === r.key ? f.trades : [] })}>
              <b>{r.label}</b><br /><span className={s.small}>{PRO_ROLE_HINT[r.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {f.role && (
        <>
          <div className={s.field}>
            <label className={s.label} htmlFor="pr-name">{f.role === 'worker' || f.role === 'licensed' ? '姓名' : '名称（公司、施工队或事务所名）'}<span className={s.required}>*</span></label>
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
              {(needLic || proService) && (
                <div className={s.field}>
                  <label className={s.label} htmlFor="pr-lic">{licensed ? '牌照号（加州承包商牌照或州执照）' : '执照号'}{needLic && <span className={s.required}>*</span>}</label>
                  <input id="pr-lic" className={s.input} value={f.licenseNo} onChange={(e) => set({ licenseNo: e.target.value })} />
                  <p className={s.small} style={{ margin: 0 }}>
                    {licensed ? '提交后系统自动对照加州承包商执照局（CSLB）官方名单：状态、类别、工伤保险、保证金。' : needLic ? '工作人员会到发证机构官网核对。' : '你选的工种不需要州执照，有执照也可以填。'}
                    需要执照的工种，没有执照一律不能接。
                  </p>
                </div>
              )}
              {needLic && !licensed && docUpload('执照照片（选填）', 'license', f.licenseDocUrl, 'licenseDocUrl')}
              {proService && picked.some((t) => t.licType === 'C') && docUpload('营业登记（Business License）', 'bizreg', f.businessRegUrl, 'businessRegUrl', needBizReg)}
              {proService && docUpload('责任保险（选填）', 'insurance', f.insuranceUrl, 'insuranceUrl')}
              {showStampNote && (
                <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', minHeight: 44 }}>
                  <input type="checkbox" checked={f.designNoCaStamp} onChange={(e) => set({ designNoCaStamp: e.target.checked })} />
                  没有加州执照，只做方案与咨询（不提供加州报批签章）
                </label>
              )}
              <div className={s.field}>
                <label className={s.label} htmlFor="pr-intro">一句话介绍</label>
                <input id="pr-intro" className={s.input} placeholder="例如：专做厨卫翻新，十五年经验" value={f.intro} onChange={(e) => set({ intro: e.target.value })} />
              </div>
              <div className={s.field}>
                <span className={s.label}>{proService ? '案例图' : '活儿照片'}（最多 9 张，选填）</span>
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
              <p className={s.small} style={{ marginTop: 0 }}>工人免费登记，不用填牌照。工人能联系施工队发的招工；房主、房东等发的活儿要有执照的人才能接。</p>
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

          <div className={s.card}>
            <p className={s.cardTitle}>接活规则</p>
            <ul className={j.steps}>
              {(res.rules.length ? res.rules : meta.rules).map((r) => <li key={r}>{r}</li>)}
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
        <li>在「我的接活」里能改资料、看通知给你的活儿、看核验状态。</li>
      </ol>
      <div className={s.btnRow}>
        {needPay && <Link href="/zh/join" className={`${s.btn} ${j.btnWork}`}>去交会费</Link>}
        <Link href="/zh/jobs/mine" className={`${s.btn} ${s.btnGhost}`}>我的接活</Link>
        <Link href="/zh/jobs/posts" className={`${s.btn} ${s.btnQuiet}`}>看全部活儿</Link>
      </div>
    </>
  );
}
