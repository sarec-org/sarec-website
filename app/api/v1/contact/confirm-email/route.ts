/** POST /api/v1/contact/confirm-email { t } —— 邮件里“确认邮箱”按钮（网页自动提交；不需要登录） */
import { confirmEmailToken } from '@/lib/crm/contactInfo';
import { body, handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<{ t?: string }>(req);
  return ok(await confirmEmailToken(String(b.t ?? '')));
});
