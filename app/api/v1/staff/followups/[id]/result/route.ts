/** POST /api/v1/staff/followups/:id/result { result: 'reached' | 'no_answer' | 'scheduled', date? } —— 四.5 联系回填：自动改状态、记时间（ops） */
import { recordContactResult } from '@/lib/crm/followupKit';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ result?: string; date?: string }>(req);
  return ok(await recordContactResult(actor(s), s.name, params.id, String(b.result ?? ''), b.date ?? null));
});
