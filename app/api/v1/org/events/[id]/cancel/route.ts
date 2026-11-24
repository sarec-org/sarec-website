/** POST 取消这场活动（只有负责人） */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { cancelEvent } from '@/lib/org/service';
export const POST = handler(async (req: Request, { params }: { params: { id: string } }) => ok(await cancelEvent(await requireContact(req), params.id)));
