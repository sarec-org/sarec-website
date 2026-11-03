/** POST /api/v1/events/:slug/cancel —— 一键取消报名（已签到的不能取消；未付款订单同时取消） */
import { withTransaction } from '@/lib/db/client';
import { cancelRegistration } from '@/lib/crm/events';
import { requireEvent } from '@/lib/crm/flow';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  await withTransaction(async (db) => cancelRegistration(db, (await requireEvent(db, params.slug)).id, me));
  return ok({ message: '已取消报名' });
});
