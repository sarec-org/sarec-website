/** GET /api/v1/docs[?event=<活动 slug>] —— 小程序「商会资料」列表（只给公开的；不用登录）。带 event 只列那场的讲座资料 */
import { handler, ok, siteUrl } from '@/lib/crm/http';
import { listPublic } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ docs: await listPublic(siteUrl(req), { eventSlug: new URL(req.url).searchParams.get('event') }) }));
