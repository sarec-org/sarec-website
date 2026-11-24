/** GET /api/v1/me/photos —— 1.4.0「我的照片」：我在所有活动传的照片，按活动分组 */
import { listAllMyPhotos } from '@/lib/crm/customerPhotos';
import { handler, isMpOlderThan, mpVersion, ok, requireContact } from '@/lib/crm/http';
import { retryPendingSoon } from '@/lib/crm/imageGate';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  // 指令 55：打开「我的照片」时顺手重交卡住的图（2 分钟一次），再取列表，这样刚通过的当场就显示
  if (mpVersion(req)) await retryPendingSoon(me);
  return ok({ groups: await listAllMyPhotos(me, !!mpVersion(req) && !isMpOlderThan(req, [1, 5, 0])) });
});
