/** POST /api/v1/auth/code/send { channel: 'email'|'sms', target } —— 发验证码（60 秒内不重复发） */
import { sendLoginCode, type Channel } from '@/lib/crm/auth';
import { body, handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<{ channel?: Channel; target?: string }>(req);
  const channel: Channel = b.channel === 'sms' ? 'sms' : 'email';
  const r = await sendLoginCode(channel, String(b.target ?? ''));
  return ok({ target: r.target, ...(r.devCode ? { devCode: r.devCode } : {}) });
});
