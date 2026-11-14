/** POST /api/v1/meetups/:id { action: join|leave|cancel, reason? } —— 1.5.0 我参加 / 不去了 / 发起人取消 / 负责人下架 */
import { cancelMeetup, joinMeetup } from '@/lib/crm/clubs';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ action?: string; reason?: string }>(req);
  if (b.action === 'join' || b.action === 'leave') return ok(await joinMeetup(me, params.id, b.action === 'join'));
  if (b.action === 'cancel') return ok(await cancelMeetup(me, params.id, b.reason ?? null));
  throw new CrmError('bad_request', '不支持的操作');
});
