'use client';
/** /zh/jobs/trades：全部工种和服务——按组排的方块页（不是列表）；?group= 只出这一组的方块 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import s from '@/components/crm/crm.module.css';
import j from './jobs.module.css';
import { BottomBar, JobsShell, trackJobs } from './shared';
import type { Meta, Trade } from './types';

/** 找工人这边只显示开放、并且已经有核验通过的人的工种；工作人员预览时全显示（没人的变淡） */
export function visibleTrades(meta: Meta): Trade[] {
  return meta.trades.filter((t) => t.open && (t.hasPros || meta.staffPreview));
}

export function TradesPage() {
  const sp = useSearchParams();
  const only = sp.get('group');
  return (
    <JobsShell
      side="find"
      need="find"
      back={only ? { href: '/zh/jobs/trades', label: '‹ 全部工种和服务' } : undefined}
      eyebrow="找工人／施工队"
      title={only ? undefined : '全部工种和服务'}
      footer={() => (
        <BottomBar>
          <Link href="/zh/jobs/post" className={`${s.btn} ${j.btnFind}`}>发布活儿</Link>
        </BottomBar>
      )}
    >
      {(meta) => {
        const trades = visibleTrades(meta);
        const groups = [...meta.groups].sort((a, b) => a.order - b.order).filter((g) => !only || g.key === only);
        const blocks = groups.map((g) => ({ g, ts: trades.filter((t) => t.group === g.key) })).filter((b) => b.ts.length > 0);
        if (only && groups[0]) {
          // 指向一组的首页入口：先出这一组的方块页
          return (
            <>
              <h1 className={s.h1}>{groups[0].name}</h1>
              {blocks.length === 0 ? <Empty /> : <Tiles ts={blocks[0].ts} />}
            </>
          );
        }
        if (blocks.length === 0) return <Empty />;
        return (
          <>
            <p className={s.muted}>点一个工种，看能做这一行的人和公司。</p>
            {blocks.map(({ g, ts }) => (
              <section key={g.key}>
                <h2 className={j.groupTitle}>{g.name}</h2>
                <Tiles ts={ts} />
              </section>
            ))}
          </>
        );
      }}
    </JobsShell>
  );
}

function Tiles({ ts }: { ts: Trade[] }) {
  return (
    <div className={j.tiles}>
      {ts.map((t) => (
        <Link key={t.key} href={`/zh/jobs/find/${encodeURIComponent(t.key)}`} className={`${j.tile} ${t.hasPros ? '' : j.tileOff}`} onClick={() => trackJobs('jobs_trade', t.key)}>
          {t.name}
        </Link>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className={s.notice}>
      这里暂时还没有核验通过的人。可以先发布活儿，有人登记通过后第一时间联系你。
    </div>
  );
}
