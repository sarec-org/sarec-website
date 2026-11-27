/** GET /api/v1/me/meetups —— 1.7.1（指令 94 补充）「我的组局」：我发起的 ＋ 我报了名的（快开始的在上）；next = 3 天内最近一局（首页「摇人儿」大卡小字） */
import { myMeetups } from '@/lib/crm/myMeetups';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await myMeetups(await requireContact(req))));
