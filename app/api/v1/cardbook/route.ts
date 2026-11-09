/** 1.3.1 D：名片夹。GET ?q= → 按活动分组 + 待我同意的请求；POST { token, slug? } → 扫码后“存入名片夹并回递我的名片” */
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
import { cardBook, requestExchange } from '@/lib/crm/cardbook';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await cardBook(await requireContact(req), new URL(req.url).searchParams.get('q'))));
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ token?: string; slug?: string }>(req);
  if (!b.token) throw new CrmError('bad_request', '名片码不对，请再扫一次');
  return ok(await requestExchange(me, b.token, b.slug));
});
