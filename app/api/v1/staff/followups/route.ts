/** GET /api/v1/staff/followups?status=&source=&q= —— 待跟进任务列表（ops）；POST { name, contactText, need, owner, nextDate } —— 手动添加 */
import { createManualFollowup, listFollowups } from '@/lib/crm/followups';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  return ok(await listFollowups({ status: sp.get('status'), source: sp.get('source'), q: sp.get('q') }));
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await createManualFollowup(actor(s), await body(req)));
});
