/** GET /api/v1/people/search?q= —— 1.4.1 找人：搜打开了“让商会里的人能搜到我”的人（公开名片，不含手机邮箱） */
import { searchPeople } from '@/lib/crm/cardbook';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await searchPeople(await requireContact(req), new URL(req.url).searchParams.get('q') ?? '')));
