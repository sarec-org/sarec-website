/** 1.3.1：一页流程数据（运营 / 管理员）。GET → 最近 8 场活动的扫码完成签到比例、报名到场率、分享带来的报名、人工处理项；入会转化；重复参加人数 */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { flowStats } from '@/lib/crm/flowStats';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await flowStats());
});
