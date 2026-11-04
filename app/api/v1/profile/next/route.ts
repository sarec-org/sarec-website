/** GET /api/v1/profile/next?taskId=&event= —— 下一道选填题（带积分提示）、自我介绍入口、本次已得积分、完成度 */
import { nextQuestion } from '@/lib/crm/flow';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const sp = new URL(req.url).searchParams;
  return ok(await nextQuestion(me, sp.get('taskId'), { eventSlug: sp.get('event') }));
});
