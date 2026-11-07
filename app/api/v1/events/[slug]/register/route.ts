/** POST /api/v1/events/:slug/register —— 报名（首次：name + roleSub；再次：answers 必答题；phone + email 必填）。重复提交回到原报名。 */
import { isEventOver, register, type RegisterInput } from '@/lib/crm/flow';
import { CrmError } from '@/lib/crm/events';
import { getPool } from '@/lib/db/client';
import { body, handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  // 1.2 线上问题 P-1：活动结束后不能再报名（现场签到走 /checkin，不受影响）
  const { rows } = await getPool().query<{ starts_at: Date; ends_at: Date | null; event_status: string }>(`SELECT starts_at, ends_at, event_status FROM events WHERE slug = $1`, [decodeURIComponent(params.slug)]);
  if (rows[0] && isEventOver(rows[0])) throw new CrmError('event_closed', '本场活动已结束，可以去看看照片和回顾');
  return ok(await register(params.slug, me, await body<RegisterInput>(req), { base: siteUrl(req) }));
});
