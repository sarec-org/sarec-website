/** GET /api/v1/screen-ads —— 本人等级是否免费、我的申请；POST —— 提交电子屏轮播申请
 *  含价格信息：和订单 / 会议室 / 会费接口一样，小程序 1.2 会话一律 403（1.2 小程序没有这个入口）。 */
import { applyScreenAd, screenInfo } from '@/lib/crm/venue';
import { body, denyMp12, handler, ok, optionalContact, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await denyMp12(req);
  return ok(await screenInfo(await optionalContact(req)));
});
export const POST = handler(async (req: Request) => {
  await denyMp12(req);
  return ok(await applyScreenAd(await requireContact(req), await body(req)));
});
