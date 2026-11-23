/** POST 报名 / 接龙（同一人再提交 = 改）：{ name, phone, partySize, answers, nickname, note } */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { register } from '@/lib/org/service';
export const POST = handler(async (req: Request, { params }: { params: { code: string } }) => { const me = await requireContact(req); return ok(await register(params.code, me, await body(req))); });
