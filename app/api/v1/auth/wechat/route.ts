/** POST /api/v1/auth/wechat { code } —— 小程序 wx.login 换会话；needsBind=true 时引导验证邮箱或手机号 */
import { wechatLogin } from '@/lib/crm/auth';
import { body, handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<{ code?: string }>(req);
  const r = await wechatLogin(String(b.code ?? ''));
  return ok({ token: r.token, contactId: r.contactId, needsBind: r.needsBind });
});
