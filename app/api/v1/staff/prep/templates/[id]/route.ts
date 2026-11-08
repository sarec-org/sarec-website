/** 1.3 M 模板事项（ops）
 *  POST   { item: { id?, title, role, whenLabel, anchor, offsetMinutes } } —— 新增 / 修改一项
 *  POST   { order: [id…] } —— 调顺序
 *  DELETE ?item=<id> —— 删一项；DELETE 不带 item —— 删整个模板（已生成的清单不受影响） */
import { deleteTemplate, deleteTemplateItem, reorderTemplateItems, saveTemplateItem } from '@/lib/crm/prep';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  const b = await body<{ item?: Record<string, unknown>; order?: unknown }>(req);
  if (b.order) return ok(await reorderTemplateItems(Number(params.id), b.order));
  return ok(await saveTemplateItem(Number(params.id), b.item ?? {}));
});
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  const item = new URL(req.url).searchParams.get('item');
  return ok(item ? await deleteTemplateItem(Number(params.id), Number(item)) : await deleteTemplate(Number(params.id)));
});
