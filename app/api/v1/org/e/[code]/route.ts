/** GET /api/v1/org/e/:code —— 主办方活动的报名页（任何人都能看；登录了带出自己的报名和资料）。不返回任何别人的手机号 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { publicEvent } from '@/lib/org/service';
export const GET = handler(async (req: Request, { params }: { params: { code: string } }) => ok(await publicEvent(params.code, await optionalContact(req))));
