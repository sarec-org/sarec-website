/** GET /api/v1/staff/followups/:id —— 处理记录；POST { status?, owner?, nextDate?, note?, draft? } —— 状态流转（ops） */
import { followupLog, updateFollowup } from '@/lib/crm/followups';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  return ok({ log: await followupLog(params.id) });
});
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  return ok(await updateFollowup(actor(s), params.id, await body(req)));
});
