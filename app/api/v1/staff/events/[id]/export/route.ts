/**
 * GET /api/v1/staff/events/:id/export —— 这场活动的报名名单 CSV（指令 89-B 验收 P1）。
 * 只给工作人员（运营；地区管理员只能导自己地区的活动——requireStaff 里的 regionScope 按网址里的活动 id 查），口径照「客户」导出；导出记操作记录。
 * 文件名：报名名单-活动名-活动日期.csv（中文名走 filename*，老浏览器用 filename 里的英文名）。
 */
import { exportEventRegistrationsCsv } from '@/lib/crm/staff';
import { handler, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const { csv, title, date, slug } = await exportEventRegistrationsCsv(s, params.id);
  const safe = title.replace(/[\\/:*?"<>|\r\n]+/g, '-').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60);
  const cn = `报名名单-${safe}-${date}.csv`;
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registrations-${slug.replace(/[^A-Za-z0-9_-]/g, '')}-${date}.csv"; filename*=UTF-8''${encodeURIComponent(cn)}`,
      'Cache-Control': 'no-store'
    }
  });
});
