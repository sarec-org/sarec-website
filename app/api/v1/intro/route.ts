/** GET /api/v1/intro —— 商会介绍页（朋友扫“认识商会”邀请卡打开）：简介、往期活动照片、近期活动、加商会微信、了解入会（不出现会费金额） */
import { getPool } from '@/lib/db/client';
import { listEvents } from '@/lib/crm/flow';
import { handler, isMp131, mp131Safe, ok, optionalContact } from '@/lib/crm/http';
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
  const { rows: past } = await pool.query<{ n: number }>(
    `SELECT count(DISTINCT e.id)::int AS n
       FROM events e
      WHERE e.is_listed AND e.event_status <> 'cancelled' AND coalesce(e.ends_at, e.starts_at + interval '3 hours') <= now()`
  );
  const qr = await wechatQrFor('intro', await optionalContact(req));
  const out = {
    title: '中美房地产商会 SAREC',
    tagline: '连接中美资本，重构房地产项目协作',
    about: [
      '中美房地产商会（SAREC）位于洛杉矶地区，服务关注美国房地产的投资人、项目方和从业者。',
      '商会定期举办地产讲座和企业家交流活动，组织会员之间的项目对接和资源协作。'
    ],
    // 首页回顾小修（测试 P2-H2）：客户端任何地方都不显示到场人数。线上 1.3.0 的统计块只在 stats.events > 0 时显示、
    // 两格一起出现，所以 stats 返回 0 让整块收起（不会出现“0 人次到场”）；1.3.1 只用 eventsHeld 显示“N 场活动”
    stats: { events: 0, people: 0 },
    eventsHeld: past[0]?.n ?? 0,
    photos: photos.map((p) => ({ thumb: p.thumb_url, url: p.url, slug: p.slug })),
    upcoming: noMoneySummaries((await listEvents(false)).slice(0, 3)),
    wechatQr: qr?.url ?? null,
    join: '想了解入会，可以加商会微信或联系工作人员，我们会为您介绍会员权益。'
  };
  // 1.3.1 小程序：不给人数和金额（测试 P2，和活动列表 / 详情 / 首页同一套）
  return ok(isMp131(req) ? mp131Safe(out) : out);
});
