/** 1.3 M：GET 各场活动的筹备进度；POST { eventId, template } —— 给已有活动生成清单 */
import { createEventPrep, listEventPreps } from '@/lib/crm/prep';
import { body, handler, ok, requireStaff, requireStaffAny } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaffAny(req, ['ops', 'checkin']);
  return ok({ preps: await listEventPreps() });
});
export const POST = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const b = await body<{ eventId?: string; template?: string }>(req);
  return ok(await createEventPrep(String(b.eventId ?? ''), String(b.template ?? 'lecture')));
});
