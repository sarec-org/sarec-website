/**
 * 1.3.1 交东哥的一页流程数据（后台“流程数据”页）：
 * 扫码完成签到比例、分享带来的有效报名、报名到场率、入会申请到缴费的转化、重复参加人数、每场活动需要人工处理多少项。
 * 只读查询，按最近 N 场活动算。
 */
import { getPool } from '@/lib/db/client';

export async function flowStats(limit = 8) {
  const pool = getPool();
  const { rows: events } = await pool.query<{
    id: string; slug: string; title: string; starts_at: Date; scans: number; scan_done: number; regs: number; arrived: number; shared_regs: number; shared_arrived: number; manual: number; backfill: number;
  }>(
    `SELECT e.id, e.slug, e.title, e.starts_at,
            (SELECT count(DISTINCT t.contact_id)::int FROM track_events t WHERE t.name = 'checkin_scan' AND t.target = e.slug) AS scans,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.arrival_status = 'checked_in' AND r.checkin_method = 'self_scan'
               AND EXISTS (SELECT 1 FROM track_events t WHERE t.name = 'checkin_scan' AND t.target = e.slug AND t.contact_id = r.contact_id)) AS scan_done,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.status <> 'cancelled') AS regs,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.arrival_status = 'checked_in') AS arrived,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.status <> 'cancelled' AND r.ref_contact_id IS NOT NULL) AS shared_regs,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.arrival_status = 'checked_in' AND r.ref_contact_id IS NOT NULL) AS shared_arrived,
            (SELECT count(*)::int FROM registrations r WHERE r.event_id = e.id AND r.checkin_method IN ('staff','staff_override')) AS manual,
            (SELECT count(*)::int FROM crm_audit_log a WHERE a.action = 'backfill_attendance' AND a.after_value->>'event' = e.slug) AS backfill
       FROM events e
      WHERE e.event_status <> 'cancelled' AND e.starts_at < now() AND e.slug NOT LIKE 'dev%'
      ORDER BY e.starts_at DESC LIMIT $1`,
    [limit]
  );
  const { rows: rep } = await pool.query<{ repeaters: number; attendees: number }>(
    `SELECT count(*) FILTER (WHERE n >= 2)::int AS repeaters, count(*)::int AS attendees
       FROM (SELECT r.contact_id, count(*) AS n FROM registrations r JOIN events e ON e.id = r.event_id
              WHERE r.arrival_status = 'checked_in' AND e.slug NOT LIKE 'dev%' GROUP BY r.contact_id) x`
  );
  const { rows: join } = await pool.query<{ total: number; paid: number; link_sent: number }>(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'paid')::int AS paid, count(*) FILTER (WHERE status IN ('link_sent','paid'))::int AS link_sent FROM join_requests`
  ).catch(() => ({ rows: [{ total: 0, paid: 0, link_sent: 0 }] }));
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
  return {
    events: events.map((e) => ({
      slug: e.slug, title: e.title, startsAt: e.starts_at,
      scans: e.scans, scanDone: e.scan_done, scanRate: pct(e.scan_done, e.scans),
      regs: e.regs, arrived: e.arrived, arriveRate: pct(e.arrived, e.regs),
      sharedRegs: e.shared_regs, sharedArrived: e.shared_arrived,
      manual: e.manual, backfill: e.backfill
    })),
    repeaters: rep[0]?.repeaters ?? 0,
    attendees: rep[0]?.attendees ?? 0,
    join: { ...join[0], rate: pct(join[0]?.paid ?? 0, join[0]?.total ?? 0) }
  };
}
