/** POST /api/v1/auth/code/verify { channel, target, code, name?, client?: 'web'|'miniprogram', bind?: boolean }
 *  网站：写 httpOnly cookie；小程序：返回 token（Bearer）。bind=true 时把联系方式绑到当前微信档案。 */
import type { NextResponse } from 'next/server';
import { verifyLoginCode, type Channel } from '@/lib/crm/auth';
import { body, handler, ok, optionalContact, withSessionCookie } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<{ channel?: Channel; target?: string; code?: string; name?: string; client?: string; bind?: boolean }>(req);
  const mini = b.client === 'miniprogram';
  const bindTo = b.bind ? await optionalContact(req) : null;
  const r = await verifyLoginCode(b.channel === 'sms' ? 'sms' : 'email', String(b.target ?? ''), String(b.code ?? ''), {
    name: b.name,
    sessionChannel: mini ? 'miniprogram' : 'web',
    bindContactId: bindTo
  });
  const res = ok({ contactId: r.contactId, created: r.created, ...(mini ? { token: r.token } : {}) }) as NextResponse;
  return mini ? res : withSessionCookie(res, r.token);
});
