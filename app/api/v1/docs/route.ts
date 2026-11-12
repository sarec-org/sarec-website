/** GET /api/v1/docs —— 小程序「商会资料」列表（只给公开的；不用登录） */
import { handler, ok, siteUrl } from '@/lib/crm/http';
import { listPublic } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ docs: await listPublic(siteUrl(req)) }));
