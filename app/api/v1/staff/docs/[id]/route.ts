/** PATCH /api/v1/staff/docs/:id —— 改标题 / 说明 / 排序 / 是否公开 / 封面；DELETE 删除（admin） */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { deleteDoc, docStats, saveDoc } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'admin');
  return ok({ stats: await docStats(params.id) });
});
export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'admin');
  return ok({ doc: await saveDoc(s, params.id, await body<Record<string, unknown>>(req)) });
});
export const DELETE = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'admin');
  await deleteDoc(params.id);
  return ok({});
});
