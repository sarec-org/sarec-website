/**
 * POST /api/v1/workbench/bind { code, wxCode? } —— 小程序：扫后台的绑定码，把当前微信账号绑到工作人员。
 * 1.5.0 体验1（第三部分 2，扫一次码就好）：
 *   · code 可以是 8 位码、小程序码的 scene（"sb=XXXXXXXX"）或普通二维码的内容（"sarec-bind:XXXXXXXX"），服务器自己认；
 *   · 还没登录（没有会话）时可以同时带 wxCode（wx.login 的 code），服务器先登录再绑定，一次请求完成，返回 token；
 *   · 返回 { name, roles, workbench: true, todayPath }：小程序绑完直接进工作台「今天」。
 * 原来的 8 位码、团队页「出码」的 24 小时码照样能用。
 */
import { sha256, wechatLogin } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, optionalContact } from '@/lib/crm/http';
import { MP_TODAY_PAGE } from '@/lib/crm/today/mp';
import { claimBindCode, normalizeBindCode } from '@/lib/crm/workbench';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<{ code?: string; wxCode?: string }>(req);
  let me = await optionalContact(req);
  let token: string | undefined;
  if (!me && b.wxCode) {
    const r = await wechatLogin(String(b.wxCode));
    me = r.contactId;
    token = r.token;
    if (/^mp-1\.([2-9]|\d{2,})(\b|$)/.test((req.headers.get('x-sarec-client') ?? '').toLowerCase())) {
      await getPool().query(`UPDATE sessions SET client = 'mp-1.2' WHERE token_hash = $1`, [sha256(r.token)]).catch(() => undefined);
    }
  }
  if (!me) throw new CrmError('unauthorized', '请先打开小程序再扫码（小程序会自动登录）');
  const r = await claimBindCode(me, normalizeBindCode(String(b.code ?? '')));
  return ok({ ...r, workbench: true, todayPath: MP_TODAY_PAGE, ...(token ? { token } : {}) });
});
