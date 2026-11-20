/**
 * GET /api/v1/jobs/me/matched?cursor= —— D10「我的接活 · 通知给我的活儿」（小程序、网站都能调）
 * 只给核验通过（且满足缴费开关）的接活人：和他已核验工种、服务城市对口的业主类活儿（找人中、情况说明过了内容安全）。
 * 返回 { eligible, reason, needPay, items:[{id,city,trade,tradeName,description,timing,timingLabel,createdAt,contacted}], nextCursor }。
 * 不给预算、任何金额、照片、语音；招工那一类不给。
 */
import { handler, ok } from '@/lib/crm/http';
import { requireLogin, requireSide, viewer } from '@/lib/jobs/access';
import { matchedPosts } from '@/lib/jobs/posts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const v = await viewer(req);
  requireSide(v, 'work');
  return ok(await matchedPosts(requireLogin(v), new URL(req.url).searchParams.get('cursor')));
});
