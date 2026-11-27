/**
 * GET /api/v1/staff/today —— 「今天」页：一列要办的事（按角色）+ 今天现场 + 昨天的四个结果。接口见 lib/crm/today/types.ts
 * 1.5.0 体验1（第三部分 1、2、8）：
 *   · 小程序来的请求（X-Sarec-Client: mp-… / servicewechat.com / 小程序会话）：钱相关的条目去掉，每条加 mpPath（见 lib/crm/today/mp.ts）；
 *   · 返回 mpBind：登录者有没有绑定手机工作台（网站「今天」页顶上据此提示去绑）。
 */
import { getPool } from '@/lib/db/client';
import { dailyResults } from '@/lib/crm/postEvent';
import { staffCan } from '@/lib/crm/auth';
import { handler, isMiniProgramRequest, ok, requireStaffAny } from '@/lib/crm/http';
import { collectToday } from '@/lib/crm/today/registry';
import { forMiniProgram } from '@/lib/crm/today/mp';
import type { TodayPayload } from '@/lib/crm/today/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['checkin', 'finance', 'ops', 'admin']);
  const t = await collectToday(s);
  const out: TodayPayload = { ...t, yesterday: staffCan(s, 'ops') ? await dailyResults().catch(() => null) : null };
  const { rows } = await getPool()
    .query<{ bound: boolean; at: Date | null }>(`SELECT mp_contact_id IS NOT NULL AS bound, mp_bound_at AS at FROM staff_roles WHERE lower(email) = lower($1)`, [s.email])
    .catch(() => ({ rows: [] as { bound: boolean; at: Date | null }[] }));
  const mpBind = { bound: !!rows[0]?.bound, boundAt: rows[0]?.at ?? null, bindHref: '/zh/staff/settings#mp-bind' };
  if (await isMiniProgramRequest(req)) return ok({ ...forMiniProgram(out), mpBind } as unknown as Record<string, unknown>);
  // 指令 89-B 验收 P2-1：「今天新报名 N ›」——今天（洛杉矶）新报名的真实客户（口径同活动页：不含内部 / 测试账号、不含已取消），按活动分
  if (staffCan(s, 'ops') || staffCan(s, 'checkin')) {
    const { rows: nr } = await getPool()
      .query<{ eventId: string; title: string; n: number }>(
        `SELECT e.id AS "eventId", e.title, count(*)::int AS n
           FROM registrations r JOIN events e ON e.id = r.event_id JOIN contacts c ON c.id = r.contact_id
          WHERE (r.created_at AT TIME ZONE 'America/Los_Angeles')::date = (now() AT TIME ZONE 'America/Los_Angeles')::date
            AND r.status <> 'cancelled' AND c.account_kind IS NULL
          GROUP BY e.id, e.title ORDER BY n DESC, e.title`
      )
      .catch(() => ({ rows: [] as { eventId: string; title: string; n: number }[] }));
    out.newRegs = nr;
  }
  return ok({ ...out, mpBind } as unknown as Record<string, unknown>);
});
