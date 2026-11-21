/** DELETE /api/v1/workbench/jobs/cities/:key —— 删除城市：有人登记过 / 有活儿用过的只停用（不再出现在选项里，老记录照样显示），没用过的真删 */
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { deleteCity } from '@/lib/jobs/cities';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const DELETE = handler(async (req: Request, { params }: { params: { key: string } }) => {
  const s = await requireStaff(req, 'ops');
  return ok(await deleteCity(params.key, `staff:${s.name || s.email}`));
});
