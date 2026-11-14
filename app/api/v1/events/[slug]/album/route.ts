/** GET /api/v1/events/:slug/album —— 活动相册（大家传的照片，上传即可见）+ 下一场活动（相册底部报名码）；登录的人看过后首页不再提示 */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, optionalContact } from '@/lib/crm/http';
import { listEventPhotos, markAlbumSeen } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; slug: string; title: string; starts_at: Date; recap: string | null; album_published_at: Date | null; cover_url: string | null }>(
    `SELECT id, slug, title, starts_at, timezone, recap, album_published_at, cover_url FROM events WHERE slug = $1`,
    [params.slug]
  );
  const ev = rows[0];
  if (!ev) throw new CrmError('not_found', '找不到这场活动');
  const me = await optionalContact(req);
  // 1.4.0（东哥定）：上传就是进相册，大家都能看，不再等工作人员“发布”。mine = 我拍的（「全部 / 我拍的」切换用）
  const photos = (await listEventPhotos(ev.id)).map((p) => ({
    id: p.id, url: p.url, thumb: p.thumb_url, w: p.width, h: p.height, caption: p.caption, byGuest: !!p.by_customer,
    mine: !!me && p.uploader_contact_id === me, by: p.uploader_name ?? null
  }));
  const { rows: next } = await pool.query(
    `SELECT slug, title, starts_at, timezone, location_name, fee_cents, cover_url FROM events
      WHERE is_listed AND event_status = 'scheduled' AND registration_open AND starts_at > now() ORDER BY starts_at LIMIT 1`
  );
  if (me && photos.length) await markAlbumSeen(me, ev.slug);
  return ok({
    event: { slug: ev.slug, title: ev.title, startsAt: ev.starts_at, timezone: (ev as { timezone?: string }).timezone, recap: ev.recap, published: photos.length > 0, coverUrl: ev.cover_url },
    photos,
    next: next[0] ? { slug: next[0].slug, title: next[0].title, startsAt: next[0].starts_at, timezone: (next[0] as { timezone?: string }).timezone, locationName: next[0].location_name, feeCents: next[0].fee_cents, coverUrl: next[0].cover_url } : null
  });
});
