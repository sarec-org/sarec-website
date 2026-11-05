/** GET /api/v1/staff/agent/conversations/:id —— 一段对话的全部消息（级别、模型、token、花费）（ops） */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { conversationDetail } from '@/lib/agent/staff';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  return ok(await conversationDetail(params.id));
});
