/**
 * GET /api/v1/staff/review-queue —— 指令 102「等你处理（N）」：要工作人员审 / 放行的东西汇总在一处（接活人核验、小程序交来的活儿、
 * 主办方活动等放行、照片名片、重复档案、投诉、举报、机器拦下的……），一条一行，每条带「通过 / 不通过」这类按钮（TodayItem.actions），
 * 办完下次读就没有了。和「今天」是同一份待办（lib/crm/today），只取 REVIEW_KINDS 这几类。
 * 返回 { n, items, failed }；小程序来的请求同「今天」：钱相关去掉、每条带 mpPath，旧版小程序不给 /zh/staff/jobs… 的链接。
 */
import { handler, isMiniProgramRequest, isMpOlderThan, mpVersion, ok, requireStaffAny, siteUrl } from '@/lib/crm/http';
import { allProviders, collectToday } from '@/lib/crm/today/registry';
import { forMiniProgram } from '@/lib/crm/today/mp';
import { REVIEW_KINDS } from '@/lib/crm/today/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await requireStaffAny(req, ['checkin', 'finance', 'ops', 'admin']);
  const t = await collectToday(s, { providers: allProviders().filter((p) => REVIEW_KINDS.includes(p.kind)) });
  if (await isMiniProgramRequest(req)) {
    const m = forMiniProgram({ ...t, yesterday: null }, { legacyJobsLink: !mpVersion(req) || isMpOlderThan(req, [1, 7, 2]), siteBase: siteUrl(req) });
    return ok({ n: m.items.length, items: m.items, failed: t.failed });
  }
  return ok({ n: t.items.length, items: t.items, failed: t.failed });
});
