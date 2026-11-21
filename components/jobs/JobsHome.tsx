'use client';
/**
 * /zh/jobs：找工人 · 接活 首页。上「找工人／施工队」（藏蓝），下「我要接活儿」（金），中间留明显间隔。
 * 指令 9：两栏标题加粗大一号（D24）；「全部工种和服务」金底＋“全部 N 项 ›”（D26）；首页入口直接进列表页、「我要接活儿」直接摆四个身份方块（D27）。
 * 两个开关各管一个栏目；都关时普通人看到"还没开放"，工作人员照常看到并有一行提示。
 */
import Link from 'next/link';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { JobsShell, trackJobs } from './shared';
import { PostCardView } from './PostCardView';
import type { HomeEntry, Meta } from './types';

/** 指令 9 · D27：首页入口直接进列表页（指向一组的：顶上一排这一组的工种标签，可切换），不再先进方块页 */
export function entryHref(e: HomeEntry, meta?: Meta) {
  if (e.target.type === 'group') return `/zh/jobs/find?group=${encodeURIComponent(e.target.key)}`;
  const g = meta?.trades.find((t) => t.key === e.target.key)?.group;
  return `/zh/jobs/find?${g ? `group=${encodeURIComponent(g)}&` : ''}trade=${encodeURIComponent(e.target.key)}`;
}

/** 找工人这边只显示已经有核验通过的人的工种（指向一组的：组里有一个就显示）；工作人员预览时全显示 */
export function entryVisible(meta: Meta, e: HomeEntry) {
  if (meta.staffPreview || e.pinned) return true; // D29：常显的入口不管有没有人都出
  const ok = (t: Meta['trades'][number]) => t.open && t.hasPros;
  return e.target.type === 'trade' ? meta.trades.some((t) => t.key === e.target.key && ok(t)) : meta.trades.some((t) => t.group === e.target.key && ok(t));
}

export function FindPanel({ meta }: { meta: Meta }) {
  const entries = meta.homeEntries.slice(0, 7).filter((e) => entryVisible(meta, e));
  const pinnedOnly = entries.filter((e) => e.pinned);
  // D11 冷启动：一个核验通过的人都没有时，方块区换成一行招募说明 +「全部工种和服务」
  const coldStart = meta.anyPros === false;
  return (
    <section className={`${j.panel} ${j.panelFind} ${j.find}`} aria-label="找工人／施工队">
      <h2 className={`${j.panelHead} ${j.panelHeadFind}`}>找工人／施工队</h2>
      <Link href="/zh/jobs/post" className={`${j.bigBtn} ${j.bigBtnFind}`}>
        发布活儿
        <small>说清要干什么，等人联系</small>
      </Link>
      {coldStart && <p className={j.recruitLine}>{meta.recruitingText ?? '正在招募各工种的接活人，可先发布活儿等人联系'}</p>}
      <div className={j.tiles}>
        {/* D29：冷启动时照样出常显的入口；没人的入口标“招募中” */}
        {(coldStart ? pinnedOnly : entries).map((e) => {
          const recruiting = e.hasPros === false;
          return (
            <Link key={`${e.target.type}:${e.target.key}`} href={entryHref(e, meta)} className={`${j.tile} ${recruiting ? j.tileRecruit : ''}`} onClick={() => trackJobs('jobs_home_entry', e.target.key)}>
              {recruiting ? (<><span>{e.label}</span><small className={j.tileTag}>{meta.recruitingLabel ?? '招募中'}</small></>) : e.label}
            </Link>
          );
        })}
        <Link href="/zh/jobs/find" className={`${j.tile} ${j.tileAll}`}>
          <span>全部工种和服务</span>
          <small className={j.tileAllCount}>{meta.allTradesText ?? (meta.openTradeCount ? `全部 ${meta.openTradeCount} 项 ›` : '›')}</small>
        </Link>
      </div>
      <p className={s.small} style={{ margin: '0.8rem 0 0' }}>
        <Link href="/zh/jobs/my-posts" style={{ color: 'var(--ivory)' }}>我发的活儿 ›</Link>
      </p>
    </section>
  );
}

const ROLE_SUB: Record<string, string> = { company: '有承包商牌照', licensed: '自己持有执照', pro_service: '设计、测量、律师等', worker: '免费登记' };

export function WorkPanel({ meta }: { meta: Meta }) {
  const registered = !!meta.me?.pro;
  return (
    <section className={`${j.panel} ${j.panelWork} ${j.work}`} aria-label="我要接活儿">
      <h2 className={`${j.panelHead} ${j.panelHeadWork}`}>我要接活儿</h2>
      {registered ? (
        <Link href="/zh/jobs/mine" className={`${j.bigBtn} ${j.bigBtnWork}`}>
          我的接活儿
          <small>{meta.me.pro?.freeLeftText ? `${meta.me.pro.freeLeftText} · ` : ''}改资料、看通知给我的活儿、看核验状态</small>
        </Link>
      ) : (
        <>
          {/* 指令 9 · D27：四个身份方块直接摆出来，点了进登记表单、身份已选好 */}
          <p className={s.small} style={{ margin: 0 }}>登记接活儿：选你的身份，登记一次，有活儿通知你。</p>
          <div className={j.roleTiles}>
            {meta.options.proRoles.map((r) => (
              <Link key={r.key} href={`/zh/jobs/register?role=${r.key}`} className={j.roleTile}>
                {r.label}
                <small>{ROLE_SUB[r.key] ?? ''}</small>
              </Link>
            ))}
          </div>
        </>
      )}
      <div style={{ marginTop: '1rem' }}>
        {meta.latest.length === 0 ? (
          <p className={s.muted}>暂时没有新活儿，先登记，有活儿第一时间通知你。</p>
        ) : (
          meta.latest.slice(0, 3).map((p) => <PostCardView key={p.id} p={p} />)
        )}
      </div>
      <Link href="/zh/jobs/posts" className={`${s.btn} ${s.btnGhost} ${s.btnBlock}`}>看全部活儿</Link>
    </section>
  );
}

export function JobsHome() {
  return (
    <JobsShell side="none" need="either" back={{ href: '/zh', label: '‹ 返回首页' }} eyebrow="FIND WORKERS · FIND WORK" title="找工人 · 接活" noStaffLine>
      {(meta) => {
        const showFind = meta.switches.find || meta.staffPreview;
        const showWork = meta.switches.work || meta.staffPreview;
        return (
          <>
            {showFind && (
              <>
                {!meta.switches.find && <p className={j.staffOnly}>仅工作人员可见：「找工人／施工队」开关未开</p>}
                <FindPanel meta={meta} />
              </>
            )}
            {showFind && showWork && <div className={j.gap} aria-hidden />}
            {showWork && (
              <>
                {!meta.switches.work && <p className={j.staffOnly}>仅工作人员可见：「我要接活儿」开关未开</p>}
                <WorkPanel meta={meta} />
              </>
            )}
          </>
        );
      }}
    </JobsShell>
  );
}
