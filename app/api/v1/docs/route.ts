/** GET /api/v1/docs[?event=<活动 slug>][?lectures=1] —— 小程序「商会资料」列表（只给公开的；不用登录）。带 event 只列那场的讲座资料；lectures=1 只列讲座课件、按讲座时间倒序（指令 103） */
import { handler, isMpOlderThan, ok, siteUrl } from '@/lib/crm/http';
import { listPublic } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const q = new URL(req.url).searchParams;
  return ok({ docs: await listPublic(siteUrl(req), { eventSlug: q.get('event'), oldClient: isMpOlderThan(req, [1, 4, 1]), lectures: q.get('lectures') === '1' }) });
});
