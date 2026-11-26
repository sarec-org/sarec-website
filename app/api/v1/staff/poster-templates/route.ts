/**
 * 1.7.0 后台「海报模板」。GET → 全部分类和模板（含已下架）+「传自己的海报」开关；
 * POST { action: 'hide'|'show'|'up'|'down'|'set_category'|'rename', id, category?, name? } 或 { action: 'set_upload_on', on }
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { staffAction, staffList } from '@/lib/org/posterTemplates';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await staffList());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await staffAction(s, await body(req)));
});
