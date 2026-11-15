/** GET /api/v1/staff/me —— 当前工作人员与角色（未登录 401，非工作人员 403）
 *  1.4.0：另带 admins（在用管理员的名字，不带邮箱），没权限时告诉人该找谁开通 */
import { staffFor } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact } from '@/lib/crm/http';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await staffFor(await requireContact(req));
  if (!s) throw new CrmError('forbidden', '这个账号还没有开通工作人员权限，请联系管理员');
  const { rows } = await getPool()
    .query<{ name: string }>(`SELECT DISTINCT name FROM staff_roles WHERE is_active AND 'admin' = ANY(roles) ORDER BY name LIMIT 10`)
    .catch(() => ({ rows: [] as { name: string }[] }));
  return ok({ staff: { name: s.name, email: s.email, roles: s.roles }, admins: rows.map((r) => r.name) });
});
