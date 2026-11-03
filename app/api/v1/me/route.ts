/** GET /api/v1/me —— 我的：档案、会员身份与到期日、积分与明细、资料完成度、报名、订单、会议室 */
import { myOverview } from '@/lib/crm/flow';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await myOverview(await requireContact(req))));
