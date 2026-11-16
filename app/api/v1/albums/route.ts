/** GET /api/v1/albums —— 1.4.0「活动相册」列表：有照片的活动（最新在上），每场照片数 + 前 3 张缩略图 */
import { getPool } from '@/lib/db/client';
import { handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const { rows } = await getPool().query<{ slug: string; title: string; starts_at: Date; timezone: string; n: number; thumbs: string[] | null }>(
    `SELECT e.slug, e.title, e.starts_at, e.timezone, x.n, x.thumbs
       FROM events e
       JOIN LATERAL (
         SELECT count(*)::int AS n, (array_agg(p.thumb_url ORDER BY p.sort_order, p.created_at))[1:3] AS thumbs
           FROM event_photos p
          WHERE p.event_id = e.id AND NOT p.is_hidden AND p.visibility = 'album' AND p.review_status = 'ok' AND p.variant_of IS NULL
       ) x ON x.n > 0
      WHERE e.is_listed AND e.event_status <> 'cancelled'
      ORDER BY e.starts_at DESC LIMIT 60`
  );
  return ok({ albums: rows.map((r) => ({ slug: r.slug, title: r.title, startsAt: r.starts_at, timezone: r.timezone, count: r.n, thumbs: r.thumbs ?? [] })) });
});
