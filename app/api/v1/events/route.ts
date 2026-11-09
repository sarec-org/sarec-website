/** GET /api/v1/events?past=1 —— 活动列表（公开，不需要登录）；给小程序 1.2 时简介里不带金额 */
import { listEvents } from '@/lib/crm/flow';
import { handler, isMp12, isMp131, mp131Safe, ok } from '@/lib/crm/http';
import { noMoneySummaries } from '@/lib/noMoney';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const events = await listEvents(new URL(req.url).searchParams.get('past') === '1');
  const out = (await isMp12(req)) ? noMoneySummaries(events) : events;
  // 1.3.1 小程序：不给人数和金额（测试 B 段 P2）
  return ok({ events: isMp131(req) ? mp131Safe(out) : out });
});
