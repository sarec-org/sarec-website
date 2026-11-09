/** 1.3.1 C：GET /api/v1/join —— 会员权益 + 已有资料自动带入 + 申请状态；POST { name, company, industry, phone, source?, slug? } —— 提交入会申请。
 *  小程序里不出现金额、价格、付款：缴费链接由助理在后台确认后用短信 / 邮件发给申请人（网站上完成）。 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
import { joinPage, submitJoin } from '@/lib/crm/join';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await joinPage(await optionalContact(req))));
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ name?: string; company?: string; industry?: string; phone?: string; source?: string; slug?: string }>(req);
  return ok(await submitJoin(me, b, siteUrl(req)));
});
