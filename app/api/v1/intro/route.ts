/** GET /api/v1/intro —— 商会介绍页（朋友扫“认识商会”邀请卡打开）：简介、往期活动照片、近期活动、加商会微信、了解入会（不出现会费金额） */
import { getPool } from '@/lib/db/client';
import { listEvents } from '@/lib/crm/flow';
import { handler, ok, optionalContact } from '@/lib/crm/http';
import { noMoneySummaries } from '@/lib/noMoney';
import { wechatQrFor } from '@/lib/wecom';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const pool = getPool();
  const { rows: photos } = await pool.query<{ thumb_url: string; url: string; slug: string; title: string }>(
    `SELECT p.thumb_url, p.url, e.slug, e.title FROM event_photos p JOIN events e ON e.id = p.event_id
      WHERE NOT p.is_hidden AND e.album_published_at IS NOT NULL AND e.is_listed AND coalesce(p.visibility, 'album') = 'album' AND p.variant_of IS NULL
      ORDER BY e.starts_at DESC, p.sort_order, p.created_at LIMIT 9`
  ).catch(() => ({ rows: [] as { thumb_url: string; url: string; slug: string; title: string }[] }));
  const { rows: past } = await pool.query<{ n: number; people: number }>(
    `SELECT count(DISTINCT e.id)::int AS n, count(r.*) FILTER (WHERE r.arrival_status = 'checked_in')::int AS people
       FROM events e LEFT JOIN registrations r ON r.event_id = e.id
      WHERE e.is_listed AND e.event_status <> 'cancelled' AND coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now()`
  );
  const qr = await wechatQrFor('intro', await optionalContact(req));
  return ok({
    title: '中美房地产商会 SAREC',
    tagline: '连接中美资本，重构房地产项目协作',
    about: [
      '中美房地产商会（SAREC）位于洛杉矶地区，服务关注美国房地产的投资人、项目方和从业者。',
      '商会定期举办地产讲座和企业家交流活动，组织会员之间的项目对接和资源协作。'
    ],
    stats: { events: past[0]?.n ?? 0, people: past[0]?.people ?? 0 },
    photos: photos.map((p) => ({ thumb: p.thumb_url, url: p.url, slug: p.slug })),
    upcoming: noMoneySummaries((await listEvents(false)).slice(0, 3)),
    wechatQr: qr?.url ?? null,
    join: '想了解入会，可以加商会微信或联系工作人员，我们会为您介绍会员权益。'
  });
});
