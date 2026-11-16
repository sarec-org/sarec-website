/** GET /api/v1/docs/:slug —— 一份商会资料（逐页图片 + PDF 原件地址）。不用登录；后台工作人员可预览没公开的（?preview=1） */
import { staffCan, staffFor } from '@/lib/crm/auth';
import { handler, isMpOlderThan, ok, optionalContact, siteUrl } from '@/lib/crm/http';
import { getPublic } from '@/lib/docs/service';
import { memberStatus } from '@/lib/crm/membership';
import { getPool } from '@/lib/db/client';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  let preview = false;
  const me = await optionalContact(req);
  if (new URL(req.url).searchParams.get('preview')) preview = !!me && staffCan(await staffFor(me), 'admin');
  // 1.4.1：会员看“仅会员”资料的全部；注册用户看前几页（工作人员也按全部看）
  const isMember = !!me && ((await memberStatus(getPool(), me)).isMember || !!(await staffFor(me)));
  return ok({ doc: await getPublic(decodeURIComponent(params.slug), siteUrl(req), preview, isMember, isMpOlderThan(req, [1, 4, 1])) });
});
