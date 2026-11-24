/** POST 出加帮手码（只有负责人；3 天有效）；DELETE ?id= 去掉一个帮手 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { helperCode, removeHelper } from '@/lib/org/service';
import { bindQr } from '@/lib/org/admin';
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ org?: string }>(req).catch(() => ({} as { org?: string }));
  const c = await helperCode(me, b.org ?? null);
  return ok({ ...c, ...(await bindQr(c.code)) });
});
export const DELETE = handler(async (req: Request) => {
  const u = new URL(req.url);
  return ok(await removeHelper(await requireContact(req), u.searchParams.get('id') ?? '', u.searchParams.get('org')));
});
