/** GET /api/v1/screen-ads —— 本人等级是否免费、我的申请；POST —— 提交电子屏轮播申请 */
import { applyScreenAd, screenInfo } from '@/lib/crm/venue';
import { body, handler, ok, optionalContact, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await screenInfo(await optionalContact(req))));
export const POST = handler(async (req: Request) => ok(await applyScreenAd(await requireContact(req), await body(req))));
