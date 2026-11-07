/** POST /api/v1/auth/wechat { code } —— 小程序 wx.login 换会话；needsBind=true 时引导验证邮箱或手机号 */
import { wechatLogin } from '@/lib/crm/auth';
import { body, handler, ok } from '@/lib/crm/http';
import { sha256 } from '@/lib/crm/auth';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<{ code?: string }>(req);
  const r = await wechatLogin(String(b.code ?? ''));
  // 1.2 小程序登录时就标记会话：之后这个会话不带请求头也不会拿到订单、金额
  if (/^mp-1\.([2-9]|\d{2,})(\b|$)/.test((req.headers.get('x-sarec-client') ?? '').toLowerCase())) {
    await getPool().query(`UPDATE sessions SET client = 'mp-1.2' WHERE token_hash = $1`, [sha256(r.token)]).catch(() => undefined);
  }
  return ok({ token: r.token, contactId: r.contactId, needsBind: r.needsBind });
});
