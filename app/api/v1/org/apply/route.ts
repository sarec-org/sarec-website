/** GET 活动工具开着没有（{ open }，不用登录；指令 57：关着时申请页 / 开通页显示"暂时没开放"）
 *  POST 「我也要办活动」申请：{ orgName, personName, phone, note, from（从哪场活动页点进来的） } */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { apply, toolOn } from '@/lib/org/service';
export const GET = handler(async () => ok({ open: await toolOn() }));
export const POST = handler(async (req: Request) => { const me = await requireContact(req); return ok(await apply(me, await body(req))); });
