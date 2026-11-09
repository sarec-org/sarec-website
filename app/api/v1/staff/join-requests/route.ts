/** 1.3.1 C：入会申请（后台 / 工作台）。GET ?status= → 列表；POST { id, action: 'send_link', channel: 'sms'|'email'|'copy' } | { id, action: 'status', status: 'paid'|'closed'|'new', note? } */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { listJoinRequests, sendJoinLink, setJoinStatus } from '@/lib/crm/join';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ requests: await listJoinRequests(new URL(req.url).searchParams.get('status')) });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ id?: string; action?: string; channel?: string; status?: string; note?: string }>(req);
  if (!b.id) throw new CrmError('bad_request', '请先选择申请');
  if (b.action === 'send_link' && (b.channel === 'sms' || b.channel === 'email' || b.channel === 'copy')) return ok(await sendJoinLink(s, b.id, b.channel));
  if (b.action === 'status' && (b.status === 'paid' || b.status === 'closed' || b.status === 'new')) return ok(await setJoinStatus(s, b.id, b.status, b.note));
  throw new CrmError('bad_request', '操作不对，请刷新后再试');
});
