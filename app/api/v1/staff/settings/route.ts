/** GET /api/v1/staff/settings —— 配置项、会议室、商家优惠、工作人员（admin）
 *  POST { kind: 'setting', key, value } | { kind: 'room', id?, name, hourlyCents, isActive } | { kind: 'staff', email, name, roles, isActive }（admin） */
import { getSettings, updateSetting, upsertRoom, upsertStaffRole } from '@/lib/crm/staff';
import { CrmError } from '@/lib/crm/events';
import { unbindStaff } from '@/lib/crm/workbench';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'admin');
  return ok(await getSettings());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  const b = await body<{ kind?: string; key?: string; value?: unknown; id?: number; name?: string; hourlyCents?: number; isActive?: boolean; email?: string; roles?: string[] }>(req);
  if (b.kind === 'setting') return ok(await updateSetting(s, String(b.key ?? ''), b.value));
  if (b.kind === 'room') return ok(await upsertRoom(s, b));
  if (b.kind === 'staff') return ok(await upsertStaffRole(s, b));
  // 1.3 N：换人时解绑小程序工作台
  if (b.kind === 'staff_unbind') return ok(await unbindStaff(String(b.email ?? '')));
  throw new CrmError('bad_request', '未知操作');
});
