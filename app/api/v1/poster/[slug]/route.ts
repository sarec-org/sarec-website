/** GET /api/v1/poster/:slug —— 邀请海报素材（本人头像、姓名、专属码、活动信息）。注册用户也能生成。 */
import { posterData } from '@/lib/crm/cards';
import { handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) =>
  ok(await posterData(await requireContact(req), decodeURIComponent(params.slug), siteUrl(req)))
);
