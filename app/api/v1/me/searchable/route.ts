/** POST /api/v1/me/searchable { on: boolean } —— 1.4.1 让商会里的人能搜到我（随时可以关） */
import { setCardSearchable } from '@/lib/crm/cards';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const b = await body<{ on?: boolean }>(req);
  return ok(await setCardSearchable(await requireContact(req), b.on === true));
});
