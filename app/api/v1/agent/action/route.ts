/** POST /api/v1/agent/action —— 访客在确认卡片上点击后的动作（访客确认后才提交）
 *  { kind: 'lead', conversationId, need, region, timeline, wantsCall, name, phone, email, wechat } → 待跟进任务 + 邮件通知 info@（同一对话只一次）
 *  { kind: 'registered', conversationId, slug } → 记录通过助手报名成功（报名本身调用现有 /api/v1/events/:slug/register） */
import { cookies } from 'next/headers';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, optionalContact, siteUrl } from '@/lib/crm/http';
import { VISITOR_COOKIE } from '@/lib/agent/engine';
import { recordRegistered, submitLead } from '@/lib/agent/actions';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const POST = handler(async (req: Request) => {
  const visitor = cookies().get(VISITOR_COOKIE)?.value;
  if (!visitor) throw new CrmError('not_found', '找不到这段对话，请刷新页面后再试');
  const b = await body<Record<string, unknown>>(req);
  if (b.kind === 'lead') return ok(await submitLead(visitor, await optionalContact(req), b, siteUrl(req)));
  if (b.kind === 'registered') {
    await recordRegistered(visitor, b);
    return ok();
  }
  throw new CrmError('bad_request', '未知操作');
});
