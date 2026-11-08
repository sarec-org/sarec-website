/** POST /api/v1/workbench/bind { code } —— 小程序：扫后台的绑定码，把当前微信账号绑到工作人员 */
import { body, handler, ok, requireContact } from '@/lib/crm/http';
import { claimBindCode } from '@/lib/crm/workbench';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ code?: string }>(req);
  return ok(await claimBindCode(me, String(b.code ?? '')));
});
