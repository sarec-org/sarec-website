'use client';
/**
 * /zh/jobs：找工人 · 接活 首页。上「找工人／施工队」（藏蓝），下「我要接活」（金），中间留明显间隔。
 * 两个开关各管一个栏目；都关时普通人看到"还没开放"，工作人员照常看到并有一行提示。
 */
import Link from 'next/link';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { JobsShell, trackJobs } from './shared';
import { PostCardView } from './PostCardView';
import type { HomeEntry, Meta } from './types';

export function entryHref(e: HomeEntry) {
  return e.target.type === 'group' ? `/zh/jobs/trades?group=${encodeURIComponent(e.target.key)}` : `/zh/jobs/find/${encodeURIComponent(e.target.key)}`;
}

/** 找工人这边只显示已经有核验通过的人的工种（指向一组的：组里有一个就显示）；工作人员预览时全显示 */
export function entryVisible(meta: Meta, e: HomeEntry) {
  if (meta.staffPreview) return true;
  const ok = (t: Meta['trades'][number]) => t.open && t.hasPros;
  return e.target.type === 'trade' ? meta.trades.some((t) => t.key === e.target.key && ok(t)) : meta.trades.some((t) => t.group === e.target.key && ok(t));
}

export function FindPanel({ meta }: { meta: Meta }) {
  const entries = meta.homeEntries.slice(0, 7).filter((e) => entryVisible(meta, e));
  return (
    <section className={`${j.panel} ${j.panelFind} ${j.find}`} aria-label="找工人／施工队">
      <h2 className={j.panelTitle}>找工人／施工队</h2>
      <Link href="/zh/jobs/post" className={`${j.bigBtn} ${j.bigBtnFind}`}>
        发布活儿
        <small>说清要干什么，等人联系</small>
      </Link>
      <div className={j.tiles}>
        {entries.map((e) => (
          <Link key={`${e.target.type}:${e.target.key}`} href={entryHref(e)} className={j.tile} onClick={() => trackJobs('jobs_home_entry', e.target.key)}>{e.label}</Link>
        ))}
        <Link href="/zh/jobs/trades" className={`${j.tile} ${j.tileAll}`}>全部工种和服务</Link>
      </div>
      <p className={s.small} style={{ margin: '0.8rem 0 0' }}>
        <Link href="/zh/jobs/my-posts" style={{ color: 'var(--ivory)' }}>我发的活儿 ›</Link>
      </p>
    </section>
  );
}

export function WorkPanel({ meta }: { meta: Meta }) {
  const registered = !!meta.me?.pro;
  return (
    <section className={`${j.panel} ${j.panelWork} ${j.work}`} aria-label="我要接活">
      <h2 className={j.panelTitle}>我要接活</h2>
      {registered ? (
        <Link href="/zh/jobs/mine" className={`${j.bigBtn} ${j.bigBtnWork}`}>
          我的接活
          <small>改资料、看通知给我的活儿、看核验状态</small>
        </Link>
      ) : (
        <Link href="/zh/jobs/register" className={`${j.bigBtn} ${j.bigBtnWork}`}>
          登记接活
          <small>登记一次，有活儿通知你</small>
        </Link>
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
                {!meta.switches.work && <p className={j.staffOnly}>仅工作人员可见：「我要接活」开关未开</p>}
                <WorkPanel meta={meta} />
              </>
            )}
          </>
        );
      }}
    </JobsShell>
  );
}
