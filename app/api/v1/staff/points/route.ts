/** POST /api/v1/staff/points { contactId, points, reason } —— 积分调整（admin，必须填原因）
 *  POST { reverseLedgerId, reason } —— 撤销某笔积分（admin） */
import { adjustPoints, reversePoints } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  const b = await body<{ contactId?: string; points?: number; reason?: string; reverseLedgerId?: string }>(req);
  if (b.reverseLedgerId) return ok(await reversePoints(s, b.reverseLedgerId, String(b.reason ?? '')));
  return ok(await adjustPoints(s, String(b.contactId ?? ''), Number(b.points), String(b.reason ?? '')));
});
