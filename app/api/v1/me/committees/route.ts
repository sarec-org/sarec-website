/** GET /api/v1/me/committees —— 专委会与俱乐部（已成立 / 筹备中）+ 我的意向；POST { key, on } —— 表达 / 取消意向 */
import { body, handler, ok, optionalContact, requireContact } from '@/lib/crm/http';
import { committees, setCommitteeInterest } from '@/lib/crm/staff12';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ committees: await committees(await optionalContact(req)) }));
export const POST = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ key?: string; on?: boolean }>(req);
  return ok({ committees: await setCommitteeInterest(me, String(b.key ?? ''), b.on !== false) });
});
