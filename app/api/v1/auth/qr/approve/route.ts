/** POST /api/v1/auth/qr/approve { code } —— 小程序扫网站二维码后确认登录（需已登录） */
import { approveQrLogin } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ code?: string }>(req);
  const code = String(b.code ?? '').replace(/^SAREC-LOGIN:/, '');
  if (!(await approveQrLogin(code, me))) throw new CrmError('qr_expired', '二维码已过期，请在网站上刷新后重新扫码');
  return ok({ message: '已确认，网站将自动登录' });
});
