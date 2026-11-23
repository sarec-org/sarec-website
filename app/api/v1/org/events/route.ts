/** POST /api/v1/org/events —— 发一场活动（copyFrom = 再办一场的原活动） */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { createEvent } from '@/lib/org/service';
export const POST = handler(async (req: Request) => { const me = await requireContact(req); const b = await body(req); return ok(await createEvent(me, b, typeof b.org === 'string' ? b.org : null)); });
