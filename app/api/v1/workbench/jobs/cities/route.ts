/**
 * 城市（后台增删改、排序，不用发版；发活儿、登记接活、所有城市筛选都用这一张表）
 * GET  —— { regions: [{ region, regionSort, items: [{ key, name, region, regionSort, sort, enabled, pros, posts }] }] }（含停用的；pros/posts = 用过的数量）
 * POST —— 新增或修改 { key?（不给 = 新增）, name, region, enabled? } → { city }
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { staffCities, upsertCity } from '@/lib/jobs/cities';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await staffCities());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok({ city: await upsertCity(await body(req), `staff:${s.name || s.email}`) });
});
