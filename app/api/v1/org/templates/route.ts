/** GET /api/v1/org/templates —— 发活动用的模板、报名表可勾的项目、用过的地点 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { recentPlaces, templates } from '@/lib/org/service';
export const GET = handler(async (req: Request) => { const me = await requireContact(req); return ok({ ...(await templates(me)), places: await recentPlaces(me) }); });
