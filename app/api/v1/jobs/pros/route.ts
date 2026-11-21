/** GET /api/v1/jobs/pros?trade=&trades=a,b&group=&city=&role=worker&cursor= —— 找工人列表（只列核验通过、上了列表的）；D27：trades 多工种（逗号分隔） */
import { handler, ok } from '@/lib/crm/http';
import { requireSide, viewer } from '@/lib/jobs/access';
import { listPros } from '@/lib/jobs/pros';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const v = await viewer(req);
  requireSide(v, 'find');
  const q = new URL(req.url).searchParams;
  return ok(await listPros({ trade: q.get('trade'), trades: q.get('trades'), group: q.get('group'), city: q.get('city'), role: q.get('role'), cursor: q.get('cursor') }));
});
