/** GET /api/v1/me —— 我的：档案、会员身份与到期日、积分与明细、资料完成度、报名、订单、会议室 */
import { myOverview, myOverviewMp } from '@/lib/crm/flow';
import { handler, isMp12, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// ?view=mp 或 1.2 小程序的会话：不含订单、金额；网站与旧版小程序 1.1.x 保持不变
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const mp = new URL(req.url).searchParams.get('view') === 'mp' || (await isMp12(req));
  // 1.6.0：开通的主办方（负责人 / 帮手）在「我的」里多一行「我办的活动」；不是主办方的人这里是 null，页面和以前一样
  const [data, organizer] = await Promise.all([mp ? myOverviewMp(me) : myOverview(me), mp ? import('@/lib/org/service').then((m) => m.meEntry(me)).catch(() => null) : null]);
  return ok(mp ? { ...data, organizer } : data);
});
