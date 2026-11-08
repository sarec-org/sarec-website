/** 1.3 H：POST /api/v1/me/phone/wx { code } —— “一键填入微信手机号”（手机号快速验证组件，按次计费）
 *  后台“增长与设置”打开 phone_quick 后才可用；只用来填表（不改档案、不做合并），用户拒绝时小程序回到手填。 */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { getSetting } from '@/lib/crm/orders';
import { withWxToken, wxConfigured } from '@/lib/crm/wechat';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  await requireContact(req);
  if (!(await getSetting<boolean>(getPool(), 'phone_quick', false)) || !wxConfigured()) throw new CrmError('forbidden', '请直接填写手机号');
  const b = await body<{ code?: string }>(req);
  const code = String(b.code ?? '');
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(code)) throw new CrmError('bad_request', '请直接填写手机号');
  const d = await withWxToken(
    async (token) => {
      const res = await fetch(`https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      return (await res.json()) as { errcode?: number; phone_info?: { purePhoneNumber?: string; countryCode?: string } };
    },
    (r) => r.errcode || undefined
  );
  const pure = d.phone_info?.purePhoneNumber ?? '';
  const cc = d.phone_info?.countryCode ?? '';
  if (d.errcode || !pure || !cc) throw new CrmError('wx_error', '没取到微信手机号，请直接填写');
  return ok({ phone: `+${cc}${pure}`, countryCode: `+${cc}`, number: pure });
});
