/** GET /api/v1/staff/screen-ads?status= —— 电子屏申请（ops）；POST { id, action: approve|reject|schedule, startMonth?, note? } —— 审核排期（ops） */
import { listScreenAds, reviewScreenAd } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ ads: await listScreenAds(new URL(req.url).searchParams.get('status')) });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ id?: string; action?: 'approve' | 'reject' | 'schedule'; startMonth?: string; note?: string }>(req);
  return ok(await reviewScreenAd(s, String(b.id ?? ''), b));
});
