/** GET 取一场活动（改活动 / 再办一场用）；PATCH 改活动（负责人或帮手） */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { eventForEdit, updateEvent } from '@/lib/org/service';
type P = { params: { id: string } };
export const GET = handler(async (req: Request, { params }: P) => ok(await eventForEdit(await requireContact(req), params.id, siteUrl(req))));
export const PATCH = handler(async (req: Request, { params }: P) => { const me = await requireContact(req); return ok(await updateEvent(me, params.id, await body(req))); });
