/** POST /api/v1/jobs/pros/:id/contact —— 找工人的人点“联系”：给电话（和微信），记录谁看过（要登录） */
import { handler, ok } from '@/lib/crm/http';
import { requireLogin, requireSide, viewer } from '@/lib/jobs/access';
import { contactPro } from '@/lib/jobs/pros';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const v = await viewer(req);
  requireSide(v, 'find');
  return ok(await contactPro(params.id, v, requireLogin(v)));
});
