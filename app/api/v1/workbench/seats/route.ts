/** 1.3.1 B：名额与确认（工作台 / 后台）。
 *  GET ?eventId= → 已确认 / 未确认 / 候补三组数 + 当前上限 / 硬上限 + 候补名单
 *  POST { eventId, action: 'add', add: 10|20 } | { eventId, action: 'set', set } —— 加名额（不超过硬上限），空位按候补顺序递补
 *       { eventId, action: 'admit', contactId } —— 现场手动放人（候补转正式）
 *       { action: 'exempt', contactId, exempt } —— 解除 / 恢复“连续爽约进候补”
 *       { action: 'timeline', on } —— 管理员：确认时间线开关（打开前一条消息都不发） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';

import { confirmBoard, raiseCapacity, setNoshowExempt, setTimelineEnabled, staffAdmit, timelineEnabled } from '@/lib/crm/seats';
import { mpSafe } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'checkin');
  const eventId = new URL(req.url).searchParams.get('eventId');
  if (!eventId) return ok({ timelineEnabled: await timelineEnabled() });
  const { rows: wait } = await getPool().query(
    `SELECT r.contact_id, NULLIF(c.name, '微信用户') AS name, c.member_no::int, r.confirm_status, r.offer_expires_at, r.noshow_waitlisted,
            row_number() OVER (ORDER BY coalesce(r.waitlisted_at, r.created_at), r.created_at)::int AS pos
       FROM registrations r JOIN contacts c ON c.id = r.contact_id
      WHERE r.event_id = $1 AND r.status = 'waitlisted' ORDER BY pos`,
    [eventId]
  );
  return ok(mpSafe({ board: await confirmBoard(eventId), waitlist: wait, timelineEnabled: await timelineEnabled() }));
});
export const POST = handler(async (req: Request) => {
  const b = await body<{ eventId?: string; action?: string; add?: number; set?: number; contactId?: string; exempt?: boolean; on?: boolean }>(req);
  if (b.action === 'timeline') {
    const s = await requireStaff(req, 'admin');
    return ok(await setTimelineEnabled(s, !!b.on));
  }
  if (b.action === 'admit') {
    const s = await requireStaff(req, 'checkin');
    if (!b.eventId || !b.contactId) throw new CrmError('bad_request', '请先选择活动和要放进来的人');
    return ok(await staffAdmit(s, b.eventId, b.contactId));
  }
  const s = await requireStaff(req, 'ops');
  if (b.action === 'exempt' && b.contactId) return ok(await setNoshowExempt(s, b.contactId, b.exempt !== false));
  if (!b.eventId) throw new CrmError('bad_request', '请先选择活动');
  if (b.action === 'add' && [10, 20].includes(Number(b.add))) return ok(await raiseCapacity(s, b.eventId, { add: Number(b.add) }));
  if (b.action === 'set' && b.set != null) return ok(await raiseCapacity(s, b.eventId, { set: Number(b.set) }));
  throw new CrmError('bad_request', '操作不对，请刷新后再试');
});
