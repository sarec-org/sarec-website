/** 1.3.1 E：后台改客户的常驻地区 / 关注地区（留操作记录）。POST { contactId, region, focus? } */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { isRegion } from '@/lib/crm/regions';
import { audit } from '@/lib/crm/staff';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ contactId?: string; region?: string | null; focus?: string[] }>(req);
  if (!b.contactId) throw new CrmError('bad_request', '请先选择客户');
  if (b.region != null && !isRegion(b.region)) throw new CrmError('bad_request', '地区不对');
  const pool = getPool();
  const { rows } = await pool.query(`SELECT region_self, focus_regions FROM contacts WHERE id = $1`, [b.contactId]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这个客户');
  await pool.query(`UPDATE contacts SET region_self = $2, focus_regions = coalesce($3, focus_regions), updated_at = now() WHERE id = $1`, [b.contactId, b.region ?? null, Array.isArray(b.focus) ? b.focus.filter(isRegion) : null]);
  await audit(pool as never, s, 'contact_region', 'contact', b.contactId, { before: rows[0], after: { region: b.region, focus: b.focus } });
  return ok({ ok: true });
});
