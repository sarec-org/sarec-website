/** POST /api/v1/events/:slug/subscribe { accepted: [模板ID 或 'day_before' / 'two_hours'] } —— 小程序：用户允许的活动提醒 */
import { saveSubscriptions } from '@/lib/crm/reminders';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ accepted?: unknown }>(req);
  const accepted = Array.isArray(b.accepted) ? b.accepted.filter((x): x is string => typeof x === 'string').slice(0, 5) : [];
  return ok(await saveSubscriptions(me, params.slug, accepted));
});
