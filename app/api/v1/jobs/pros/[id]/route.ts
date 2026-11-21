/** GET /api/v1/jobs/pros/:id —— 一个接活人的卡片（详情页） */
import { handler, ok } from '@/lib/crm/http';
import { requireSide, viewer } from '@/lib/jobs/access';
import { getProPublic } from '@/lib/jobs/pros';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const v = await viewer(req);
  requireSide(v, 'find');
  return ok({ pro: await getProPublic(params.id, v) });
});
