/** POST /api/v1/workbench/jobs/posts/:id { action:'remove'|'note', note? } —— 下架、写备注 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { staffPostAction } from '@/lib/jobs/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  return ok(await staffPostAction(s, params.id, await body(req)));
});
