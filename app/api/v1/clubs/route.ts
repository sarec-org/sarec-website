/** GET /api/v1/clubs —— 1.5.0 专委会与俱乐部列表（人数、我加没加入、以前表达过意向的提示） */
import { listClubs } from '@/lib/crm/clubs';
import { handler, ok, optionalContact } from '@/lib/crm/http';
import { committeeProfile } from '@/lib/crm/staff12';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** 1.5.0 体验1（第三部分 5）：另带 profile { hasName, hasPhone }——缺的话小程序点「加入」前先弹补填 */
export const GET = handler(async (req: Request) => {
  const me = await optionalContact(req);
  // 指令 25 性能：两样同时查（以前先后查），返回不变
  const [p, clubs] = await Promise.all([committeeProfile(me), listClubs(me)]);
  return ok({ clubs, profile: { hasName: !!p.name, hasPhone: !!p.phone } });
});
