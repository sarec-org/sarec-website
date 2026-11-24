/** GET 海报素材（主办方名字、活动信息、报名小程序码地址）；记下海报是按哪一版时间地点出的 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { posterData } from '@/lib/org/service';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => ok(await posterData(await requireContact(req), params.id, siteUrl(req))));
