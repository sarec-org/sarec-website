/** GET /api/v1/showcase —— 1.5.0 商会风采（副会长单位、战略合作方） */
import { listShowcase } from '@/lib/crm/ugc';
import { handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => ok({ orgs: await listShowcase(false) }));
