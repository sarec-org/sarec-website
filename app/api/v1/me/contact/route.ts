/**
 * GET  /api/v1/me/contact —— 我的联系方式（打码值、状态、是否需要更新 / 是否该再确认）
 * POST /api/v1/me/contact { phone?, email? } —— 修改；新值重新验证，旧值留在后台历史
 */
import { getPool } from '@/lib/db/client';
import { getContactInfo, updateMyContact } from '@/lib/crm/contactInfo';
import { body, handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ contactInfo: await getContactInfo(getPool(), await requireContact(req)) }));
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  return ok(await updateMyContact(me, await body<{ phone?: string; email?: string }>(req), siteUrl(req)));
});
