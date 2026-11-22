/** POST /api/v1/auth/code/send { channel: 'email'|'sms', target, purpose?: 'staff' } —— 发验证码（60 秒内不重复发） */
import { assertStaffEmail, sendLoginCode, type Channel } from '@/lib/crm/auth';
import { body, handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<{ channel?: Channel; target?: string; purpose?: string }>(req);
  const channel: Channel = b.channel === 'sms' ? 'sms' : 'email';
  // 后台登录框（purpose: 'staff'）：不是工作人员邮箱当场提示，不发码
  if (b.purpose === 'staff' && channel === 'email') await assertStaffEmail(String(b.target ?? ''));
  const r = await sendLoginCode(channel, String(b.target ?? ''));
  return ok({ target: r.target, ...(r.devCode ? { devCode: r.devCode } : {}), ...(r.testFixedCode ? { testFixedCode: true } : {}) });
});
