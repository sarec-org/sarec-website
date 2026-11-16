/** GET /api/v1/people/find?q=&industry=&city=&offer=&seek= —— 1.5.0 找合作：按行业、城市、“能提供 / 在找”筛人 */
import { findPeople } from '@/lib/crm/ugc';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  return ok(await findPeople(await requireContact(req), { q: sp.get('q') ?? '', industry: sp.get('industry') ?? '', city: sp.get('city') ?? '', offer: sp.get('offer') ?? '', seek: sp.get('seek') ?? '' }));
});
