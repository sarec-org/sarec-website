/** PUT /api/v1/workbench/jobs/cities/order { regions: [{ region, keys: [...] }] } —— 地区顺序、地区内顺序都按数组；也能把城市挪到别的地区 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { reorderCities } from '@/lib/jobs/cities';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const PUT = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await reorderCities(await body(req), `staff:${s.name || s.email}`));
});
