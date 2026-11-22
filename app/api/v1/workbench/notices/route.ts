/**
 * GET /api/v1/workbench/notices —— 1.5.0 体验1（第三部分 8）：小程序工作台「我的通知」：本人最近 30 条工作人员通知，
 * 每条带 mpPath（点开直达小程序工作台里对应的那一条）。收款相关的（mpPath 为 null）在小程序里不给，只在网站后台看。
 */
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { recentNotices } from '@/lib/crm/staffNotify';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['checkin', 'ops', 'admin']);
  const rows = await recentNotices(s.email, false, 30);
  return ok({ notices: rows.filter((r) => r.mpPath).map((r) => ({ id: r.id, title: r.title, category: r.category_label, at: r.sent_at ?? r.created_at, mpPath: r.mpPath })) });
});
