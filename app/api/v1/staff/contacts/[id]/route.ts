/** GET /api/v1/staff/contacts/:id —— 档案、标签、答案历史与来源、积分、会费申请、完整时间线（ops） */
import { contactDetail } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { setAccountKind, type AccountKind } from '@/lib/crm/accountKind';
import { CrmError } from '@/lib/crm/events';
import { actor } from '@/lib/crm/staff';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  return ok(await contactDetail(params.id));
});
/** POST { action: 'account_kind', kind: 'internal'|'review_demo'|'test'|null } —— 管理员标记内部 / 审核演示 / 测试账号 */
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'admin');
  const b = await body<{ action?: string; kind?: string | null }>(req);
  if (b.action !== 'account_kind') throw new CrmError('bad_request', '操作不对，请刷新后再试');
  const kind = b.kind == null || b.kind === '' ? null : (['internal', 'review_demo', 'test'] as const).find((k) => k === b.kind);
  if (kind === undefined) throw new CrmError('bad_request', '账号类型不对');
  return ok(await setAccountKind(actor(s), params.id, (kind ?? null) as AccountKind | null));
});
