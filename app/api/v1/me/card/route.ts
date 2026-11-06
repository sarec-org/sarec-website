/** GET /api/v1/me/card —— 我的名片；POST { name?, company?, title?, intro?, wechatId?, showPhone?, showEmail?, showWechat? } —— 修改 */
import { myCard, updateMyCard } from '@/lib/crm/cards';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ card: await myCard(await requireContact(req)) }));
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  return ok({ card: await updateMyCard(me, await body(req)) });
});
