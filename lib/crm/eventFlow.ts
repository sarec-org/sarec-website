/**
 * 后台综合优化 六：活动。
 * - 活动结束后自动变成“已结束”（不许一直显示“进行中”）：结束时间（没填 = 开始后 3 小时）再过 3 小时，状态改成 completed，留 auto_completed_at。
 * - 每场活动一个页面的“分栏数字”：报名与签到 / 筹备清单 / 相册 / 回顾 / 数据。
 */
import { getPool } from '@/lib/db/client';
import { CrmError } from './events';

export async function autoCompleteEvents(now = new Date()): Promise<{ completed: number }> {
  const { rowCount } = await getPool().query(
    `UPDATE events SET event_status = 'completed', auto_completed_at = now(), updated_at = now()
      WHERE event_status = 'scheduled' AND coalesce(ends_at, starts_at + interval '3 hours') < $1::timestamptz - interval '3 hours'`,
    [now]
  );
  return { completed: rowCount ?? 0 };
}

/** 活动显示的状态（列表和活动页共用）：没到 = 报名中 / 未开始；正在办 = 进行中；结束了 = 已结束 */
export function eventPhase(e: { starts_at: Date | string; ends_at?: Date | string | null; event_status: string }, now = new Date()): { key: string; label: string } {
  if (e.event_status === 'cancelled') return { key: 'cancelled', label: '已取消' };
  if (e.event_status === 'postponed') return { key: 'postponed', label: '延期' };
  const start = new Date(e.starts_at).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 3 * 3600_000;
  if (e.event_status === 'completed' || end <= now.getTime()) return { key: 'ended', label: '已结束' };
  if (start <= now.getTime()) return { key: 'live', label: '进行中' };
  return { key: 'upcoming', label: '未开始' };
}

/** 活动页顶上的分栏和数字 */
export async function eventHub(eventId: string) {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; slug: string; title: string; starts_at: Date; ends_at: Date | null; event_status: string }>(
    `SELECT id, slug, title, starts_at, ends_at, event_status FROM events WHERE id = $1`,
    [eventId]
  );
  const e = rows[0];
  if (!e) throw new CrmError('not_found', '找不到这场活动');
  const { rows: n } = await pool.query<{ registered: number; checked_in: number; prep_total: number; prep_done: number; prep_due: number; photos: number; photos_review: number; recap: string | null }>(
    `SELECT
       (SELECT count(*)::int FROM registrations r JOIN contacts c ON c.id = r.contact_id WHERE r.event_id = $1 AND r.status = 'registered' AND c.account_kind IS NULL) AS registered,
       (SELECT count(*)::int FROM registrations r JOIN contacts c ON c.id = r.contact_id WHERE r.event_id = $1 AND r.arrival_status = 'checked_in' AND c.account_kind IS NULL) AS checked_in,
       (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = $1) AS prep_total,
       (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = $1 AND i.done_at IS NOT NULL) AS prep_done,
       (SELECT count(*)::int FROM event_prep_items i WHERE i.event_id = $1 AND i.done_at IS NULL AND i.due_at < now() + interval '1 day') AS prep_due,
       (SELECT count(*)::int FROM event_photos p WHERE p.event_id = $1 AND p.variant_of IS NULL AND NOT p.is_hidden) AS photos,
       (SELECT count(*)::int FROM event_photos p WHERE p.event_id = $1 AND p.review_status = 'review' AND p.visibility = 'album' AND p.variant_of IS NULL AND NOT p.is_hidden) AS photos_review,
       (SELECT status FROM event_recaps r WHERE r.event_id = $1) AS recap`,
    [eventId]
  );
  return { event: { id: e.id, slug: e.slug, title: e.title, startsAt: e.starts_at, endsAt: e.ends_at, phase: eventPhase(e) }, counts: n[0] };
}
