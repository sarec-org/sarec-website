/**
 * GET /api/v1/staff/data-people?list=new|shells|arrived|joined|bringer|visitors&days=30[&key=f:poster|c:c-xxxx][&format=csv]
 * 指令 44：「数据」页每个数字点开看是谁（工作人员 ops 权限，只读）；format=csv 导出表格，记一条操作记录。
 */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { dataPeople, exportDataPeopleCsv } from '@/lib/crm/dataPeople';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  const list = sp.get('list') ?? '';
  const days = Number(sp.get('days')) || 30;
  const key = sp.get('key');
  if (sp.get('format') === 'csv') {
    const { csv, filename } = await exportDataPeopleCsv(s, list, days, key);
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' }
    });
  }
  return ok(await dataPeople(list, days, key));
});
