/** GET /api/v1/staff/events —— 活动列表含人数（ops/checkin）；POST —— 新建活动（ops） */
import { createEvent, listStaffEvents, type EventInput } from '@/lib/crm/staff';
import { staffCan } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireContact, requireStaff } from '@/lib/crm/http';
import { staffFor } from '@/lib/crm/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await staffFor(await requireContact(req));
  if (!staffCan(s, 'ops') && !staffCan(s, 'checkin')) throw new CrmError('forbidden', '您没有这个操作的权限，请联系管理员开通');
  return ok({ events: await listStaffEvents() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<EventInput & { prepTemplate?: string }>(req);
  const event = await createEvent(s, b);
  // 1.3 M：建活动时选了活动类型 → 自动生成筹备清单（按活动日期倒推截止日）
  if (b.prepTemplate && typeof b.prepTemplate === 'string') {
    const { createEventPrep } = await import('@/lib/crm/prep');
    await createEventPrep(String((event as { id: string }).id), b.prepTemplate).catch(() => undefined);
  }
  return ok({ event });
});
