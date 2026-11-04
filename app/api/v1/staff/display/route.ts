/** GET /api/v1/staff/display —— 官网展示审核列表（ops，不影响会员身份）；POST { applicationId, displayStatus, note? } */
import { listDisplayReview, setDisplay } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ applications: await listDisplayReview() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ applicationId?: string; displayStatus?: string; note?: string }>(req);
  return ok(await setDisplay(s, String(b.applicationId ?? ''), String(b.displayStatus ?? ''), b.note));
});
