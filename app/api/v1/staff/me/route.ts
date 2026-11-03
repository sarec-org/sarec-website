/** GET /api/v1/staff/me —— 当前工作人员与角色（未登录 401，非工作人员 403） */
import { staffFor } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await staffFor(await requireContact(req));
  if (!s) throw new CrmError('forbidden', '这个账号还没有开通工作人员权限，请联系管理员');
  return ok({ staff: { name: s.name, email: s.email, roles: s.roles } });
});
