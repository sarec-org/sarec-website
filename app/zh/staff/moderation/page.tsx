'use client';
/**
 * 内容 › 举报与下架（指令 89-B 验收 P2-4）：东哥要"看有没有人举报 / 把东西下架"，原来分在 7 个页面、没一个名字叫"举报"。
 * 这一页只做汇总：每一处一行——"待处理 N"＋这一处管什么＋「去处理 ›」，点进各自的页面去办（各页面本身不变）。
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { StaffGate } from '@/components/crm/staff/StaffGate';
import { api } from '@/components/crm/client';

type D = Record<'reported' | 'machine' | 'down' | 'cards' | 'cardsHidden' | 'jobs' | 'orgReview' | 'orgDown' | 'meetups' | 'photos' | 'templatesOff', number | null>;

const ROWS: { title: string; what: string; todo: (d: D) => number | null; info?: (d: D) => string; href: string }[] = [
  { title: '用户举报的内容', what: '组局、个人主页、项目、名片、照片被人点了"举报"：看一眼，下架 / 恢复 / 禁止此人，或"不用处理"', todo: (d) => d.reported, href: '/zh/staff/content?tab=reported' },
  { title: '机器拦下的内容', what: '微信内容检测没过或"建议复核"的：看过没问题就放出来', todo: (d) => d.machine, href: '/zh/staff/content?tab=machine' },
  { title: '主办方的活动', what: '等放行的主办方活动；已公开的不合适可以一键下架、停用主办方', todo: (d) => d.orgReview, info: (d) => (d.orgDown ? `已下架 ${d.orgDown} 场` : ''), href: '/zh/staff/organizers#pending' },
  { title: '俱乐部组局', what: '组局文字检测没出结果的，放行前成员看不到；也能下架组局', todo: (d) => d.meetups, href: '/zh/staff/clubs#meetups' },
  { title: '电子名片', what: '会员改过、还没看的名片；不合适的下架（写原因）', todo: (d) => d.cards, info: (d) => (d.cardsHidden ? `已下架 ${d.cardsHidden} 张` : ''), href: '/zh/staff/cards' },
  { title: '相册里客户传的照片', what: '客户上传、还没审的照片；下架、禁止某人上传', todo: (d) => d.photos, href: '/zh/staff/album' },
  { title: '找工人接活儿的投诉', what: '师傅卡片和活儿上的"反馈 / 投诉"：看内容、标已处理、下架接活人或活儿', todo: (d) => d.jobs, href: '/zh/staff/jobs/reports' },
  { title: '海报模板', what: '主办方出海报能选的底图：换图、下架、恢复', todo: () => 0, info: (d) => (d.templatesOff ? `已下架 ${d.templatesOff} 张` : ''), href: '/zh/staff/poster-templates#list' },
  { title: '已下架的用户内容', what: '下架过的组局、主页、项目、照片、名片：点进去可以恢复', todo: () => 0, info: (d) => (d.down != null ? `共 ${d.down} 条` : ''), href: '/zh/staff/content?tab=down' }
];

function Board() {
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api<D>('/api/v1/staff/moderation').then((r) => (r.ok ? setD(r.data) : setErr(r.message)));
  }, []);
  if (err) return <p className={styles.error}>{err}</p>;
  if (!d) return <p className={styles.muted}>正在数各处的待处理…</p>;
  const total = ROWS.reduce((a, r) => a + (r.todo(d) ?? 0), 0);
  return (
    <>
      <p className={styles.lead} style={{ marginTop: 0 }}>{total ? `一共 ${total} 条要处理，点每一行的「去处理 ›」。` : '现在没有要处理的举报和待审内容。'}</p>
      {ROWS.map((r) => {
        const t = r.todo(d);
        const info = r.info?.(d);
        return (
          <Link key={r.title} href={r.href} className={`${styles.card} ${t ? styles.cardGold : ''}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit', margin: '0 0 0.6rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className={styles.cardTitle} style={{ margin: 0 }}>
                {r.title}
                {t === null ? <span className={`${styles.badge} ${styles.badgeMuted}`}>读不到</span> : t > 0 ? <span className={`${styles.badge} ${styles.badgeRed}`}>待处理 {t}</span> : null}
                {info ? <span className={styles.small}>　{info}</span> : null}
              </p>
              <p className={styles.small} style={{ margin: '4px 0 0' }}>{r.what}</p>
            </div>
            <span className={`${styles.btn} ${t ? '' : styles.btnGhost} ${styles.btnSmall}`} style={{ whiteSpace: 'nowrap' }}>去处理 ›</span>
          </Link>
        );
      })}
    </>
  );
}

export default function Page() {
  return (
    <StaffGate title="举报与下架" role="ops">
      {() => <Board />}
    </StaffGate>
  );
}
