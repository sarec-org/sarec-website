/** POST /api/v1/profile/skip { taskId?, code } —— 跳过（本任务内不再出现） */
import { skipQuestion } from '@/lib/crm/flow';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ taskId?: string; code?: string }>(req);
  return ok(await skipQuestion(me, b.taskId ?? null, String(b.code ?? '')));
});
