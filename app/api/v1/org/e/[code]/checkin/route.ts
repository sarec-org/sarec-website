/** POST { k, info? } —— 扫门口签到码：已报名直接签到；没报名带资料现场报名 + 签到 */
import { body, handler, ok, optionalContact, requireContact, siteUrl } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { selfCheckin } from '@/lib/org/service';
export const POST = handler(async (req: Request, { params }: { params: { code: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ k?: string; info?: Record<string, unknown> }>(req);
  return ok(await selfCheckin(params.code, me, String(b.k ?? ''), b.info && typeof b.info === 'object' ? b.info : null));
});
