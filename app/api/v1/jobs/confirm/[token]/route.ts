/**
 * 商会代登记的接活人本人确认（不用登录；链接在确认短信里，带签名的一次性令牌）
 * GET  —— { pro{name,roleLabel,trades,cities,years,licenseNo,businessRegNo,intro,statusLabel}, phoneMasked, rules, editUrl, editHint }
 * POST —— { action:'confirm'|'decline' } → { message }；用过的链接作废（404 + 一句人话）
 */
import { body, handler, ok } from '@/lib/crm/http';
import { confirmAction, confirmView } from '@/lib/jobs/proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (_req: Request, ctx: { params: { token: string } }) => ok(await confirmView(ctx.params.token)));
export const POST = handler(async (req: Request, ctx: { params: { token: string } }) => {
  const b = await body<{ action?: unknown }>(req);
  return ok(await confirmAction(ctx.params.token, b.action));
});
