/** POST /api/v1/staff/recaps/:eventId/publish —— 一.3「直接发布」：按系统整理好的初稿原样发布（ops；已发布的再点不重复通知） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { publishRecap } from '@/lib/crm/postEvent';
import { actor } from '@/lib/crm/staff';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const POST = handler(async (req: Request, { params }: { params: { eventId: string } }) => {
  const s = await requireStaff(req, 'ops');
  if (!/^[0-9a-f-]{36}$/i.test(params.eventId)) throw new CrmError('not_found', '找不到这场活动的回顾');
  const { rows } = await getPool().query<{ status: string; recap_draft: string | null }>(`SELECT status, recap_draft FROM event_recaps WHERE event_id = $1`, [params.eventId]);
  if (!rows[0]) throw new CrmError('not_found', '这场活动的回顾还没整理好');
  if (rows[0].status === 'published') return ok({ published: true, message: '这场已经发布过了' });
  if (!rows[0].recap_draft?.trim()) throw new CrmError('bad_request', '回顾文章是空的，请点"看一眼"补几句再发布');
  const r = await publishRecap(actor(s), params.eventId, { recap: rows[0].recap_draft });
  return ok({ ...r, message: '已发布' });
});
