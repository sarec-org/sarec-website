/** GET ?code= 看开通码 / 帮手码是哪个主办方（附数据承诺）；POST { code, agree } 开通 / 加为帮手 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { claimCode, codeInfo } from '@/lib/org/service';
export const GET = handler(async (req: Request) => { await requireContact(req); return ok(await codeInfo(new URL(req.url).searchParams.get('code') ?? '')); });
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ code?: string; agree?: boolean }>(req);
  return ok(await claimCode(me, String(b.code ?? ''), b.agree === true));
});
