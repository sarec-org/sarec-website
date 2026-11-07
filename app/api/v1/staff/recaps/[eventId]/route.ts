/** GET 某场活动的回顾初稿（统计、精选照片、回顾 / 分享 / 推文 / 感谢、需求、下一场推荐）；POST 审核通过并发布 */
import { getRecap, publishRecap } from '@/lib/crm/postEvent';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { eventId: string } }) => {
  await requireStaff(req, 'ops');
  return ok({ recap: await getRecap(params.eventId) });
});
export const POST = handler(async (req: Request, { params }: { params: { eventId: string } }) => {
  const s = await requireStaff(req, 'ops');
  return ok(await publishRecap(actor(s), params.eventId, await body(req)));
});
