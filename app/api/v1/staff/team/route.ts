/** 1.3.1 F：团队（只有管理员）。GET → 工作人员（每个微信账号一行）+ 操作记录；
 *  POST { action: 'add', name, phone, cc?, roles[], regions[] } → 生成 24 小时绑定码
 *       { action: 'update', id, roles?, regions?, isActive?, name? } → 改角色 / 停用 / 启用（立即生效）
 *       { action: 'code', id } → 重新生成绑定码；{ action: 'unbind', id } → 解绑这个微信 */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { addMember, newBindCode, teamList, teamLog, updateMember } from '@/lib/crm/team';
import { unbindStaff } from '@/lib/crm/workbench';
import { audit } from '@/lib/crm/staff';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'admin');
  return ok({ team: await teamList(), log: await teamLog() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  const b = await body<{ action?: string; id?: string; name?: string; phone?: string; cc?: string; roles?: unknown; regions?: unknown; isActive?: boolean }>(req);
  if (b.action === 'add') return ok(await addMember(s, b));
  if (!b.id) throw new CrmError('bad_request', '请先选择工作人员');
  if (b.action === 'update') return ok(await updateMember(s, b.id, b));
  if (b.action === 'code') return ok(await newBindCode(s, b.id));
  if (b.action === 'unbind') {
    await unbindStaff(b.id);
    await audit(getPool() as never, s, 'team_update', 'staff', b.id, { after: { unbind: true } });
    return ok({ ok: true });
  }
  throw new CrmError('bad_request', '操作不对，请刷新后再试');
});
