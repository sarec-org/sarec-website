/** POST /api/v1/me/phone/verify { code } —— 校验短信验证码，通过后手机号标“已验证” */
import { checkPhoneCode } from '@/lib/crm/contactInfo';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ code?: string }>(req);
  return ok(await checkPhoneCode(me, String(b.code ?? '')));
});
