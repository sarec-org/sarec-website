/** 1.3 H：POST /api/v1/me/phone/wx —— 原“一键填入微信手机号”（手机号快速验证组件）。
 *  海外主体不能用这个组件（东哥 11/9 微信后台确认），永久关闭：只用手填 + 短信验证码。
 *  接口保留只为让旧版本小程序拿到明确提示、回到手填。 */
import { CrmError } from '@/lib/crm/events';
import { handler, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  await requireContact(req);
  throw new CrmError('forbidden', '请直接填写手机号');
});
