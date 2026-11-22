'use client';
/**
 * 后台综合优化 六.1：每场活动一个页面——顶上分栏：报名与签到 / 筹备清单 / 相册 / 回顾 / 数据；签到台和补登记作为这页里的动作。
 * 放在活动详情、筹备清单、相册、回顾这几页的最上面（同一场活动的几页之间一点就到）。
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '@/components/crm/crm.module.css';
import { api, fmtDateTime } from '@/components/crm/client';

type Hub = {
  event: { id: string; title: string; startsAt: string; phase: { key: string; label: string } };
  counts: { registered: number; checked_in: number; prep_total: number; prep_done: number; prep_due: number; photos: number; photos_review: number; recap: string | null };
};
export type HubTab = 'regs' | 'prep' | 'album' | 'recap' | 'data';

export function EventHub({ eventId, current }: { eventId: string; current: HubTab }) {
  const [h, setH] = useState<Hub | null>(null);
  useEffect(() => {
    if (!eventId) return;
    api<Hub>(`/api/v1/staff/events/${eventId}/hub`).then((r) => r.ok && setH(r.data));
  }, [eventId]);
  if (!eventId || !h) return null;
  const c = h.counts;
  const tabs: [HubTab, string, string][] = [
    ['regs', `报名与签到 ${c.checked_in}/${c.registered}`, `/zh/staff/events/${eventId}`],
    ['prep', c.prep_total ? `筹备清单 ${c.prep_done}/${c.prep_total}${c.prep_due ? `（${c.prep_due} 项到期）` : ''}` : '筹备清单', `/zh/staff/prep/${eventId}`],
    ['album', `相册 ${c.photos}${c.photos_review ? `（${c.photos_review} 张待审）` : ''}`, `/zh/staff/album?event=${eventId}`],
    ['recap', c.recap === 'published' ? '回顾（已发布）' : c.recap === 'drafted' ? '回顾（待发布）' : '回顾', `/zh/staff/recaps?event=${eventId}`],
    ['data', '数据', `/zh/staff/events/${eventId}?tab=data#data`]
  ];
  const ended = h.event.phase.key === 'ended';
  return (
    <div className={styles.card} style={{ padding: '0.75rem 0.9rem' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <b style={{ fontSize: '1.05rem' }}>{h.event.title}</b>
        <span className={`${styles.badge} ${h.event.phase.key === 'live' ? styles.badgeGreen : styles.badgeMuted}`}>{h.event.phase.label}</span>
        <span className={styles.small}>{fmtDateTime(h.event.startsAt)}</span>
      </div>
      <nav className={styles.tabs} aria-label="这场活动" style={{ flexWrap: 'wrap', marginTop: 8 }}>
        {tabs.map(([k, label, href]) => (
          <Link key={k} href={href} className={`${styles.tab} ${current === k ? styles.tabOn : ''}`} aria-current={current === k ? 'page' : undefined}>{label}</Link>
        ))}
      </nav>
      <div className={styles.btnRow} style={{ flexWrap: 'wrap' }}>
        {!ended && <Link className={styles.btn} style={{ minHeight: 44 }} href={`/zh/staff/checkin?event=${eventId}`}>签到台</Link>}
        {!ended && <Link className={`${styles.btn} ${styles.btnQuiet}`} style={{ minHeight: 44 }} href={`/zh/staff/checkin?event=${eventId}&onsite=1`}>现场登记</Link>}
        <Link className={`${styles.btn} ${styles.btnQuiet}`} style={{ minHeight: 44 }} href={`/zh/staff/backfill?event=${eventId}`}>补登记到场</Link>
      </div>
    </div>
  );
}

/** 活动页“数据”一栏：这场的数字 */
export function EventData({ eventId }: { eventId: string }) {
  const [h, setH] = useState<Hub | null>(null);
  useEffect(() => {
    api<Hub>(`/api/v1/staff/events/${eventId}/hub`).then((r) => r.ok && setH(r.data));
  }, [eventId]);
  if (!h) return null;
  const c = h.counts;
  const rate = c.registered ? Math.round((c.checked_in / c.registered) * 100) : 0;
  const cells: [string, string][] = [['报名', String(c.registered)], ['到场', String(c.checked_in)], ['到场率', `${rate}%`], ['照片', String(c.photos)], ['筹备完成', c.prep_total ? `${c.prep_done}/${c.prep_total}` : '—']];
  return (
    <div id="data" className={styles.card}>
      <p className={styles.cardTitle}>这场的数据（不含内部 / 测试账号）</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
        {cells.map(([l, v]) => (
          <div key={l} style={{ textAlign: 'center' }}><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{v}</div><div className={styles.small}>{l}</div></div>
        ))}
      </div>
    </div>
  );
}

/** 列表里显示的状态（和服务器 lib/crm/eventFlow.ts 的 eventPhase 一致）：结束了就是“已结束”，不再显示“进行中” */
export function phaseLabel(e: { starts_at: string; ends_at?: string | null; event_status: string }, now = Date.now()): { key: string; label: string } {
  if (e.event_status === 'cancelled') return { key: 'cancelled', label: '已取消' };
  if (e.event_status === 'postponed') return { key: 'postponed', label: '延期' };
  const start = new Date(e.starts_at).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 3 * 3600_000;
  if (e.event_status === 'completed' || end <= now) return { key: 'ended', label: '已结束' };
  if (start <= now) return { key: 'live', label: '进行中' };
  return { key: 'upcoming', label: '未开始' };
}
