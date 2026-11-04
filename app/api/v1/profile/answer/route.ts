/** POST /api/v1/profile/answer { taskId?, code, value } —— 回答一道题（同题重复提交不重复发分） */
import { answerQuestion } from '@/lib/crm/flow';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ taskId?: string; code?: string; value?: unknown }>(req);
  return ok(await answerQuestion(me, b.taskId ?? null, String(b.code ?? ''), b.value));
});
