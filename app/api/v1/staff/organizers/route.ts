/**
 * 后台「主办方」：GET 总览（开关、主办方、活动、申请）/ ?view=trial 试用看板 / ?view=log 平台查看记录；
 * POST { action, ... }：create 开通 / code 新开通码 / org 改主办方（停用、恢复、记一次帮忙、改名）/ event 放行、不放行、下架、恢复 /
 *   switch 开关 / application 申请处理 / view 平台查看名单（只有管理员，写原因，记一笔）。
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { createOrganizer, eventAction, handleApplication, newOwnerCode, overview, platformView, setSwitch, trial, updateOrganizer, viewLog } from '@/lib/org/admin';
import { CrmError } from '@/lib/crm/events';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const v = new URL(req.url).searchParams.get('view');
  if (v === 'trial') return ok(await trial());
  if (v === 'log') return ok({ log: await viewLog() });
  return ok(await overview());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body(req);
  const id = String(b.id ?? '');
  switch (b.action) {
    case 'create': return ok(await createOrganizer(s, b));
    case 'code': return ok(await newOwnerCode(s, id));
    case 'org': return ok(await updateOrganizer(s, id, { ...b, action: b.op }));
    case 'event': return ok(await eventAction(s, id, { ...b, action: b.op }));
    case 'switch': return ok(await setSwitch(s, b.key, b.on));
    case 'application': return ok(await handleApplication(s, id, b.status));
    case 'view': return ok(await platformView(s, id, b.reason));
    default: throw new CrmError('bad_request', '操作不对，请刷新后再试');
  }
});
