/** GET 名单（负责人看完整手机号；帮手只看尾号）；POST { regId, paid?, checkin? } 标已交费 / 签到（负责人、帮手都能） */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { markReg, roster } from '@/lib/org/service';
type P = { params: { id: string } };
export const GET = handler(async (req: Request, { params }: P) => ok(await roster(await requireContact(req), params.id)));
export const POST = handler(async (req: Request, { params }: P) => { const me = await requireContact(req); const b = await body(req); return ok(await markReg(me, params.id, String(b.regId ?? ''), b)); });
