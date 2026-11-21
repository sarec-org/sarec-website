/** GET/POST /api/v1/jobs/followup/:token —— 第 7 天回访一键回答（联系上了吗、成了吗、满意吗），结果只进后台 */
import { body, handler, ok } from '@/lib/crm/http';
import { CrmError } from '@/lib/crm/events';
import { followupAnswer, followupGet } from '@/lib/jobs/notify';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (_req: Request, { params }: { params: { token: string } }) => {
  const f = await followupGet(params.token);
  if (!f) throw new CrmError('not_found', '这个回访链接无效或已过期');
  return ok({ followup: f });
});
export const POST = handler(async (req: Request, { params }: { params: { token: string } }) => {
  if (!(await followupAnswer(params.token, await body(req)))) throw new CrmError('not_found', '这个回访链接无效或已过期');
  return ok({ message: '谢谢，已收到。结果只给商会工作人员看。' });
});
