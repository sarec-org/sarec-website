/** GET /api/v1/clubs —— 1.5.0 专委会与俱乐部列表（人数、我加没加入、以前表达过意向的提示） */
import { listClubs } from '@/lib/crm/clubs';
import { handler, ok, optionalContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ clubs: await listClubs(await optionalContact(req)) }));
