/** GET /api/v1/me —— 我的：档案、会员身份与到期日、积分与明细、资料完成度、报名、订单、会议室 */
import { myOverview, myOverviewMp } from '@/lib/crm/flow';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// ?view=mp：1.2 小程序（不含订单、金额）；不带参数：网站与旧版小程序 1.1.x（保持不变）
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  return ok(new URL(req.url).searchParams.get('view') === 'mp' ? await myOverviewMp(me) : await myOverview(me));
});
