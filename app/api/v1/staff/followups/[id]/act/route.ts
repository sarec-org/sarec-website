/**
 * POST /api/v1/staff/followups/:id/act { action: 'drop' | 'claim' | 'assist' | 'category', category?, token? } —— 四.2 三个按钮 + 改分类（ops）
 * 必须是已登录的工作人员。邮件里的按钮链接打开处理页，页面带着邮件口令 token 自动调用这里；token 不对（过期 / 被改）就不自动执行，只显示按钮。
 */
import { CrmError } from '@/lib/crm/events';
import { checkActionToken, quickAction, setCategory } from '@/lib/crm/followupKit';
import { actor } from '@/lib/crm/staff';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ action?: string; category?: string; token?: string; auto?: boolean }>(req);
  if (b.auto && !(await checkActionToken(params.id, b.token))) throw new CrmError('bad_token', '邮件里的按钮已过期或不完整，请在下面直接点按钮');
  if (b.action === 'category') return ok(await setCategory(actor(s), params.id, String(b.category ?? '')));
  return ok(await quickAction(actor(s), s.name, params.id, String(b.action ?? '')));
});
