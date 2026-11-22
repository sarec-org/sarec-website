/** GET /api/v1/staff/today —— 「今天」页：一列要办的事（按角色）+ 今天现场 + 昨天的四个结果。接口见 lib/crm/today/types.ts */
import { dailyResults } from '@/lib/crm/postEvent';
import { staffCan } from '@/lib/crm/auth';
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { collectToday } from '@/lib/crm/today/registry';
import type { TodayPayload } from '@/lib/crm/today/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['checkin', 'finance', 'ops', 'admin']);
  const t = await collectToday(s);
  const out: TodayPayload = { ...t, yesterday: staffCan(s, 'ops') ? await dailyResults().catch(() => null) : null };
  return ok(out as unknown as Record<string, unknown>);
});
