/**
 * 1.5.0 体验1 · 第三部分 6：匿名“微信用户”补填提示（规则见 lib/crm/fillPrompt.ts）
 * GET  —— { show, missing, reason, prefillName, moments, never, title, body }（没登录 show=false）
 * POST { action: 'later' } —— 以后再说（7 天内不再提示，3 次后不再主动提示）
 * POST { action: 'fill', name?, phone? } —— 补填；还缺返回 400 need_name_phone
 */
import { fillPrompt, fillPromptAction } from '@/lib/crm/fillPrompt';
import { body, handler, ok, optionalContact, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await fillPrompt(await optionalContact(req))));
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  return ok(await fillPromptAction(me, await body(req)));
});
