/**
 * POST /api/v1/docs/:slug/email —— 把这份资料 / 课件的下载链接发到我登记并验证过的邮箱（指令 104-4，电脑上打开方便）。
 * 要登录；没验证邮箱 → code email_unverified（小程序引导去验证）；仅会员资料非会员 → locked；同一份每人每天最多 3 次。
 * 发信用名单导出那套（Resend）；预览站只发给测试白名单。
 */
import { handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
import { emailDoc } from '@/lib/docs/slides';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  return ok(await emailDoc(me, decodeURIComponent(params.slug), siteUrl(req)));
});
