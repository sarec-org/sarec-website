/** POST /api/v1/me/phone/send —— 给当前手机号发验证码（Twilio Verify；已验证过的号码直接通过） */
import { sendPhoneCode } from '@/lib/crm/contactInfo';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => ok(await sendPhoneCode(await requireContact(req))));
