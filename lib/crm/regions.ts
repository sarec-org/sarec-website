/**
 * 1.3.1 E：分地区。
 * - 地区：洛杉矶/橙县、旧金山湾区、纽约、美国其他、中国大陆、其他；默认洛杉矶/橙县。
 * - 常驻地区：本人填写的（region_self）优先；没填的按报名过的活动地区推断（region_inferred），
 *   推断取“去过最多的地区”，参加一次外地活动不改常驻地。两者分开存。
 * - 活动推广（订阅消息、短信、邮件通讯）按常驻地区 + 关注地区筛选；已报名活动的服务通知（确认、候补、改地址、取消）按报名关系发，不受地区限制。
 */
import { getPool } from '@/lib/db/client';

export const REGIONS = ['洛杉矶/橙县', '旧金山湾区', '纽约', '美国其他', '中国大陆', '其他'] as const;
export const DEFAULT_REGION = '洛杉矶/橙县';
export const isRegion = (r: unknown): r is string => typeof r === 'string' && (REGIONS as readonly string[]).includes(r);

const TZ_LABEL: Record<string, string> = {
  'America/Los_Angeles': '洛杉矶时间',
  'America/New_York': '纽约时间',
  'America/Chicago': '芝加哥时间',
  'Asia/Shanghai': '北京时间',
  'Asia/Hong_Kong': '香港时间'
};
export const tzLabel = (tz: string | null | undefined) => TZ_LABEL[tz || 'America/Los_Angeles'] ?? '当地时间';
export const REGION_TZ: Record<string, string> = { '洛杉矶/橙县': 'America/Los_Angeles', 旧金山湾区: 'America/Los_Angeles', 纽约: 'America/New_York', 中国大陆: 'Asia/Shanghai' };

/** 一个人的常驻地区（本人填的优先，其次推断，最后默认） */
export async function regionOf(contactId: string | null): Promise<{ region: string; source: 'self' | 'inferred' | 'default' }> {
  if (!contactId) return { region: DEFAULT_REGION, source: 'default' };
  const { rows } = await getPool().query<{ region_self: string | null; region_inferred: string | null }>(
    `SELECT region_self, region_inferred FROM contacts WHERE id = $1`,
    [contactId]
  ).catch(() => ({ rows: [] as { region_self: string | null; region_inferred: string | null }[] }));
  const r = rows[0];
  if (r?.region_self && isRegion(r.region_self)) return { region: r.region_self, source: 'self' };
  if (r?.region_inferred && isRegion(r.region_inferred)) return { region: r.region_inferred, source: 'inferred' };
  return { region: DEFAULT_REGION, source: 'default' };
}

/** 每天跑：没填常驻地区的人，按报名过的活动地区推断（去过最多的；平手不改） */
export async function inferRegions(): Promise<number> {
  const { rowCount } = await getPool().query(
    `WITH counts AS (
       SELECT r.contact_id, e.region, count(*) AS n FROM registrations r JOIN events e ON e.id = r.event_id
        WHERE r.status <> 'cancelled' GROUP BY 1, 2
     ), ranked AS (
       SELECT contact_id, region, n, rank() OVER (PARTITION BY contact_id ORDER BY n DESC) AS rk, count(*) OVER (PARTITION BY contact_id, n) AS ties FROM counts
     )
     UPDATE contacts c SET region_inferred = x.region, updated_at = now()
       FROM ranked x
      WHERE x.contact_id = c.id AND x.rk = 1 AND x.ties = 1 AND c.region_self IS NULL AND c.region_inferred IS DISTINCT FROM x.region`
  );
  return rowCount ?? 0;
}

/** 活动推广的目标地区（本地区 / 指定几个 / 全部） */
export function promoRegions(ev: { region: string; notify_scope: string; notify_regions: string[] }): string[] | 'all' {
  if (ev.notify_scope === 'all') return 'all';
  if (ev.notify_scope === 'regions') return Array.from(new Set([ev.region, ...(ev.notify_regions ?? [])]));
  return [ev.region];
}

/** 活动推广收件人：常驻地区（本人填写优先，没有用推断，再没有按默认）或关注地区在目标里 */
export async function promoAudience(eventId: string): Promise<string[]> {
  const pool = getPool();
  const { rows: ev } = await pool.query<{ region: string; notify_scope: string; notify_regions: string[] }>(`SELECT region, notify_scope, notify_regions FROM events WHERE id = $1`, [eventId]);
  if (!ev[0]) return [];
  const target = promoRegions(ev[0]);
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM contacts c WHERE c.merged_into IS NULL AND NOT coalesce(c.is_placeholder, false)
       AND ($1::boolean OR coalesce(c.region_self, c.region_inferred, $3) = ANY($2::text[]) OR c.focus_regions && $2::text[])`,
    [target === 'all', target === 'all' ? [] : target, DEFAULT_REGION]
  ).catch(async () => pool.query<{ id: string }>(
    `SELECT id FROM contacts c WHERE ($1::boolean OR coalesce(c.region_self, c.region_inferred, $3) = ANY($2::text[]) OR c.focus_regions && $2::text[])`,
    [target === 'all', target === 'all' ? [] : target, DEFAULT_REGION]
  ));
  return rows.map((r) => r.id);
}
