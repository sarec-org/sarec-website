/** 后台综合优化 一.4：GET /api/v1/staff/committees —— 专委会 / 俱乐部意向名单（真实姓名、手机、邮箱；匿名老意向标“待补填”） */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { committeeInterestList } from '@/lib/crm/staff12';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ interests: await committeeInterestList() });
});
