/** POST /api/v1/workbench/jobs/pros/:id/verify { action:'approve'|'return'|'remove'|'check', reason?, trades? } */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { staffVerify } from '@/lib/jobs/verify';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  return ok(await staffVerify(s, params.id, await body(req)));
});
