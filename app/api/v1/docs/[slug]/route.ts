/** GET /api/v1/docs/:slug —— 一份商会资料（逐页图片 + PDF 原件地址）。不用登录；后台工作人员可预览没公开的（?preview=1） */
import { staffCan, staffFor } from '@/lib/crm/auth';
import { handler, ok, optionalContact, siteUrl } from '@/lib/crm/http';
import { getPublic } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  let preview = false;
  if (new URL(req.url).searchParams.get('preview')) {
    const id = await optionalContact(req);
    preview = !!id && staffCan(await staffFor(id), 'admin');
  }
  return ok({ doc: await getPublic(decodeURIComponent(params.slug), siteUrl(req), preview) });
});
