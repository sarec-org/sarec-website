/** GET /api/v1/org/home[?org=] —— 我办的活动：总数、进行中、办过的、帮手 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { orgHome } from '@/lib/org/service';
export const GET = handler(async (req: Request) => ok(await orgHome(await requireContact(req), new URL(req.url).searchParams.get('org'))));
