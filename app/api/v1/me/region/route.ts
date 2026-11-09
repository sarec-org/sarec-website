/** 1.3.1 E：GET → 我的常驻地区（本人填写 / 推断 / 默认）+ 关注地区 + 选项；PUT { region?, focus? } → 本人修改（存为“本人填写”） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
import { REGIONS, isRegion, regionOf } from '@/lib/crm/regions';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const { rows } = await getPool().query<{ focus_regions: string[] }>(`SELECT focus_regions FROM contacts WHERE id = $1`, [me]);
  return ok({ ...(await regionOf(me)), focus: rows[0]?.focus_regions ?? [], options: REGIONS });
});
export const PUT = handler(async (req: Request) => {
  const me = await requireContact(req);
  const b = await body<{ region?: string; focus?: string[] }>(req);
  if (b.region !== undefined && !isRegion(b.region)) throw new CrmError('bad_request', '请选择常住地区');
  const focus = Array.isArray(b.focus) ? b.focus.filter(isRegion) : null;
  await getPool().query(
    `UPDATE contacts SET region_self = coalesce($2, region_self), focus_regions = coalesce($3, focus_regions), updated_at = now() WHERE id = $1`,
    [me, b.region ?? null, focus]
  );
  return ok({ ...(await regionOf(me)), focus: focus ?? undefined });
});
