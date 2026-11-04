/** GET /api/v1/staff/contacts/:id —— 档案、标签、答案历史与来源、积分、会费申请、完整时间线（ops） */
import { contactDetail } from '@/lib/crm/staff';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  return ok(await contactDetail(params.id));
});
