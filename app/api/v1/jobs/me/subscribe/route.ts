/** POST /api/v1/jobs/me/subscribe { accepted: [模板ID] } —— 用户允许一次派活订阅消息，记一次（允许一次发一条） */
import { body, handler, ok } from '@/lib/crm/http';
import { requireLogin, viewer } from '@/lib/jobs/access';
import { addSubscription } from '@/lib/jobs/pros';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = requireLogin(await viewer(req));
  const b = await body<{ accepted?: unknown }>(req);
  return ok(await addSubscription(me, b.accepted));
});
