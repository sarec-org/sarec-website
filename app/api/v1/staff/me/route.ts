/** GET /api/v1/staff/me —— 当前工作人员与角色（未登录 401，非工作人员 403）
 *  后台综合优化：工作人员每次打开后台，登录顺延 90 天
 *  1.4.0：另带 admins（在用管理员的名字，不带邮箱），没权限时告诉人该找谁开通 */
import { staffFor } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact, tokenFrom, withSessionCookie } from '@/lib/crm/http';
import { SESSION_COOKIE, SESSION_DAYS, sha256 } from '@/lib/crm/auth';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await staffFor(await requireContact(req));
  if (!s) throw new CrmError('forbidden', '这个账号还没有开通工作人员权限，请联系管理员');
  const { rows } = await getPool()
    .query<{ name: string }>(`SELECT DISTINCT name FROM staff_roles WHERE is_active AND 'admin' = ANY(roles) ORDER BY name LIMIT 10`)
    .catch(() => ({ rows: [] as { name: string }[] }));
  const res = ok({ staff: { name: s.name, email: s.email, roles: s.roles }, admins: rows.map((r) => r.name) }) as NextResponse;
  // 后台综合优化 五.5：工作人员手机上登录保持 90 天——每次打开后台顺延（网站 cookie 会话；小程序会话不动）
  const tok = cookies().get(SESSION_COOKIE)?.value;
  if (tok && tok === tokenFrom(req)) {
    await getPool()
      .query(`UPDATE sessions SET expires_at = now() + make_interval(days => $2) WHERE token_hash = $1 AND expires_at < now() + make_interval(days => $2) - interval '1 day'`, [sha256(tok), SESSION_DAYS])
      .catch(() => undefined);
    return withSessionCookie(res, tok);
  }
  return res;
});
