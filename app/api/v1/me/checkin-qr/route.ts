/** GET /api/v1/me/checkin-qr?slug= —— 我的个人签到码（图片为 data URL；码里是公开中转网址 /zh/c/<报名编号>） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { personalCheckinQr } from '@/lib/crm/checkinCode';
import { handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  const { rows } = await getPool().query<{ id: string; status: string }>(
    `SELECT r.id, r.status FROM registrations r JOIN events e ON e.id = r.event_id WHERE e.slug = $1 AND r.contact_id = $2 AND r.status <> 'cancelled'`,
    [slug, me]
  );
  if (!rows[0]) throw new CrmError('not_registered', '没有找到您这场的报名');
  return ok({ qr: await personalCheckinQr(siteUrl(req), rows[0].id), status: rows[0].status });
});
