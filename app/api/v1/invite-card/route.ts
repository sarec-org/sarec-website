/** GET /api/v1/invite-card —— “认识商会”邀请卡素材（本人姓名、公司、专属码、后台可改的文案；不含金额） */
import { chamberInviteData } from '@/lib/crm/cards';
import { handler, ok, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await chamberInviteData(await requireContact(req), siteUrl(req))));
