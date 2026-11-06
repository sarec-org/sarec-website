/** POST /api/v1/auth/code/verify { channel, target, code, name?, client?: 'web'|'miniprogram', bind?: boolean }
 *  网站：写 httpOnly cookie；小程序：返回 token（Bearer）。bind=true 时把联系方式绑到当前微信档案。 */
import type { NextResponse } from 'next/server';
import { sha256, verifyLoginCode, type Channel } from '@/lib/crm/auth';
import { getPool } from '@/lib/db/client';
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
  if (mini && (req.headers.get('x-sarec-client') ?? '').toLowerCase().startsWith('mp-1.2')) {
    await getPool().query(`UPDATE sessions SET client = 'mp-1.2' WHERE token_hash = $1`, [sha256(r.token)]).catch(() => undefined);
  }
  const res = ok({ contactId: r.contactId, created: r.created, ...(mini ? { token: r.token } : {}) }) as NextResponse;
  return mini ? res : withSessionCookie(res, r.token);
});
