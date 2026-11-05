/** GET /api/v1/staff/exceptions?status=open|all —— 待处理（失败 / 异常）；POST { id, action: 'retry'|'ignore' } */
import { ignoreException, listExceptions, retryException } from '@/lib/crm/followups';
import { CrmError } from '@/lib/crm/events';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ exceptions: await listExceptions(new URL(req.url).searchParams.get('status') ?? 'open') });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ id?: string; action?: string }>(req);
  if (!b.id) throw new CrmError('bad_request', '缺少记录');
  if (b.action === 'ignore') { await ignoreException(actor(s), b.id); return ok({ ok: true, message: '已标记为不处理' }); }
  return ok(await retryException(actor(s), b.id, siteUrl(req)));
});
