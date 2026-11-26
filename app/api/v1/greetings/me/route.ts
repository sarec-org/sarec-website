/** GET /api/v1/greetings/me（登录）—— 节日祝福落款用的名片资料 { card: { name, company, title, avatarUrl, logoUrl }, defaultLine }，没有的字段是 null */
import { handler, ok, requireContact } from '@/lib/crm/http';
import { greetingMe } from '@/lib/org/greetings';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await greetingMe(await requireContact(req))));
