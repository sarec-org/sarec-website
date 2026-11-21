'use client';
/** /zh/jobs/mine：我的接活儿（金色）——核验状态、改资料、"现在有空"开关、通知给我的活儿 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/components/crm/client';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell, NeedLogin } from './shared';
import { PostCardView } from './PostCardView';
import { ProFormView } from './ProRegister';
import type { Meta, MeProRes, PostCard } from './types';

type Notified = { count: number; webUrl?: string; items?: PostCard[] };

export function MyPro() {
  return (
    <JobsShell side="work" need="work" eyebrow="我要接活儿" title="我的接活儿">
      {(meta) => (
        <>
          <p className={s.small} style={{ marginTop: 0 }}>找人干活、自己发过活儿的，看<Link href="/zh/jobs/my-posts" style={{ color: 'var(--gold)' }}>「我发的活儿」›</Link></p>
          <Body meta={meta} />
        </>
      )}
    </JobsShell>
  );
}

function Body({ meta }: { meta: Meta }) {
  const [res, setRes] = useState<MeProRes | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [nt, setNt] = useState<Notified | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await api<MeProRes>('/api/v1/jobs/me/pro');
    if (!r.ok) return r.status === 401 ? setNeedLogin(true) : setErr(r.message);
    setNeedLogin(false);
    setErr(null);
    setRes(r.data);
    const n = await api<Notified>('/api/v1/jobs/me/notified');
    setNt(n.ok ? n.data : { count: 0 });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleAvail() {
    if (!res?.pro) return;
    setBusy(true);
    const r = await api<{ pro: MeProRes['pro'] }>('/api/v1/jobs/me/pro', { method: 'PATCH', body: { availableNow: !res.pro.availableNow } });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    setRes({ ...res, pro: r.data.pro });
  }

  if (needLogin) return <NeedLogin why="登录后看你的接活儿登记。" onDone={load} />;
  if (err && !res) return <div className={s.error}>{err} <button className={j.linkBtn} onClick={load}>再试一次</button></div>;
  if (!res) return <p className={s.muted}>正在加载…</p>;
  const pro = res.pro;
  if (!pro) {
    return (
      <>
        <div className={s.notice}>你还没有登记接活儿。登记一次，有对口的活儿第一时间通知你。</div>
        <BottomBar><Link href="/zh/jobs/register" className={`${s.btn} ${j.btnWork}`}>登记接活儿</Link></BottomBar>
      </>
    );
  }
  if (edit) {
    return (
      <>
        <button className={s.back} onClick={() => { setEdit(false); load(); }}>‹ 回我的接活儿</button>
        <ProFormView meta={meta} res={res} editing onSaved={() => load()} />
      </>
    );
  }
  const st = pro.status;
  const color = st === 'verified' ? 'var(--signal-green)' : st === 'returned' || st === 'removed' ? '#f3c9c9' : 'var(--gold-bright)';
  return (
    <>
      {err && <div className={s.error}>{err}</div>}
      <div className={s.card} style={{ borderLeft: '3px solid var(--gold)' }}>
        <p className={s.cardTitle}>{pro.name}</p>
        <div className={s.row}><span className={s.rowLabel}>身份</span><span className={s.rowValue}>{pro.roleLabel}</span></div>
        <div className={s.row}><span className={s.rowLabel}>核验状态</span><span className={s.rowValue}><b style={{ color }}>{pro.statusLabel}</b>{pro.verifiedAt && st === 'verified' ? `（${pro.verifiedAt}）` : ''}</span></div>
        {pro.needsReview && st === 'verified' && <div className={s.row}><span className={s.rowLabel}>新改的资料</span><span className={s.rowValue}>工作人员正在看</span></div>}
        <div className={s.row}><span className={s.rowLabel}>能做的工种</span><span className={s.rowValue}>{pro.tradeNames.map((n, i) => `${n}${pro.verifiedTrades.includes(pro.trades[i]) ? '' : '（待核验）'}`).join('、')}</span></div>
        <div className={s.row}><span className={s.rowLabel}>在找工人列表上</span><span className={s.rowValue}>{pro.role === 'worker' ? '工人不上列表，施工队招工时通知你' : pro.listed ? '是，别人能找到你' : '还没有'}</span></div>
        {pro.licenseNo && <div className={s.row}><span className={s.rowLabel}>牌照号</span><span className={`${s.rowValue} ${s.mono}`}>{pro.licenseNo}</span></div>}
        {pro.nextReviewAt && st === 'verified' && <div className={s.row}><span className={s.rowLabel}>下次自动复核</span><span className={s.rowValue}>{pro.nextReviewAt}</span></div>}
        {pro.badges.length > 0 && <div style={{ marginTop: '0.4rem' }}>{pro.badges.map((b) => <span key={b.kind + b.text} className={`${j.badge} ${b.kind === 'license' || b.kind === 'member' ? j.badgeOk : ''}`}>{b.text}</span>)}</div>}
        {st === 'returned' && pro.returnReason && <p className={s.error} style={{ marginTop: '0.6rem' }}>退回原因：{pro.returnReason}。改好资料再提交一次就行，不收任何钱。</p>}
        {st === 'removed' && <p className={s.error} style={{ marginTop: '0.6rem' }}>已下架{pro.removedReason ? `：${pro.removedReason}` : ''}。有疑问请联系商会工作人员。</p>}
        {st === 'pending' && <p className={s.small} style={{ margin: '0.6rem 0 0' }}>正在核验，通常 1–2 个工作日。结果会通知你。</p>}
        {st === 'verified' && pro.freeLeft != null && (
          <div className={s.row}><span className={s.rowLabel}>免费联系</span><span className={s.rowValue}><b>{pro.freeLeft > 0 ? `还可以免费联系 ${pro.freeLeft} 位` : '免费次数用完了'}</b></span></div>
        )}
        {st === 'verified' && pro.freeLeft === 0 && (
          <div className={s.notice} style={{ marginTop: '0.6rem' }}>
            免费次数用完了，成为商会会员后可以继续联系发布人（看过的活儿照样能看）。
            <div style={{ marginTop: '0.5rem' }}><Link href="/zh/join" className={`${s.btn} ${j.btnWork}`}>成为商会会员</Link></div>
          </div>
        )}
        {st === 'verified' && pro.needPay && meta.switches.requirePaid && (
          <div className={s.notice} style={{ marginTop: '0.6rem' }}>
            核验通过了。还差一步：成为缴费会员，就能上列表、看发布人电话。
            <div style={{ marginTop: '0.5rem' }}><Link href="/zh/join" className={`${s.btn} ${j.btnWork}`}>去交会费</Link></div>
          </div>
        )}
      </div>

      <div className={j.toggleRow} style={{ marginBottom: '1rem' }}>
        <span>现在有空<br /><span className={s.small}>{pro.availableNow ? '名字旁边显示"现在有空"' : '关着：不显示"现在有空"'}</span></span>
        <button type="button" role="switch" aria-checked={pro.availableNow} disabled={busy || st === 'removed'} className={`${j.switch} ${pro.availableNow ? j.switchOn : ''}`} onClick={toggleAvail} aria-label="现在有空" />
      </div>

      <h2 className={s.h}>通知给我的活儿</h2>
      {!nt ? (
        <p className={s.muted}>正在加载…</p>
      ) : nt.items && nt.items.length > 0 ? (
        nt.items.map((p) => <PostCardView key={p.id} p={p} />)
      ) : (
        <p className={s.muted}>还没有通知给你的活儿。有对口工种、在你服务城市的活儿发出来，会第一时间通知你。<Link href="/zh/jobs/posts" style={{ color: 'var(--gold)' }}>先看看全部活儿 ›</Link></p>
      )}

      {st !== 'removed' && (
        <BottomBar>
          <button type="button" className={`${s.btn} ${j.btnWork}`} onClick={() => setEdit(true)}>{st === 'returned' ? '改资料，重新提交' : '改资料'}</button>
          <Link href="/zh/jobs/posts" className={`${s.btn} ${s.btnGhost}`}>看全部活儿</Link>
        </BottomBar>
      )}
    </>
  );
}
