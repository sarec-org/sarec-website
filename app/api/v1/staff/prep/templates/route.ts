/** 1.3 M 筹备清单模板（ops）：GET 全部模板及事项；POST 新建 / 修改模板 { id?, key?, name, roles[], shootingList, settings } */
import { listTemplates, saveTemplate } from '@/lib/crm/prep';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ templates: await listTemplates() });
});
export const POST = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await saveTemplate(await body(req)));
});
