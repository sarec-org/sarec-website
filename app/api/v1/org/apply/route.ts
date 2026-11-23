/** POST 「我也要办活动」申请：{ orgName, personName, phone, note, from（从哪场活动页点进来的） } */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { apply } from '@/lib/org/service';
export const POST = handler(async (req: Request) => { const me = await requireContact(req); return ok(await apply(me, await body(req))); });
