/** 1.4.1 工作台 · 到场名单点开一个人：GET 完整档案（不含金额）；POST { action: note|tag|followup, text?, eventId? } 当场写备注、打标签、标“要跟进” */
import { body, handler, ok, requireStaffAny } from '@/lib/crm/http';
import { mpSafe, workbenchPerson, workbenchPersonAction } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaffAny(req, ['checkin', 'ops']);
  return ok(mpSafe(await workbenchPerson(params.id)));
});
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaffAny(req, ['checkin', 'ops']);
  return ok(await workbenchPersonAction(s, params.id, await body(req)));
});
