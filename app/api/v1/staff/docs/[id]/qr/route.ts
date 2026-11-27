/**
 * GET /api/v1/staff/docs/:id/qr —— 这份资料 / 课件的专属小程序码（PNG，下载用；指令 104-5）。
 * 渠道码那一套：扫码进这份课件页并带 channel，扫码人数在后台「渠道码」里看。测试站没配微信时是测试码。运营能用。
 */
import { CrmError } from '@/lib/crm/events';
import { handler, requireStaff } from '@/lib/crm/http';
import { getPool } from '@/lib/db/client';
import { ensureQr } from '@/lib/docs/slides';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await requireStaff(req, 'ops');
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) throw new CrmError('not_found', '找不到这份资料');
  const { rows } = await getPool().query<{ id: string; slug: string; title: string }>(`SELECT id, slug, title FROM chamber_docs WHERE id = $1`, [params.id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这份资料');
  const { png } = await ensureQr(rows[0], s.name || s.email);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="doc-${rows[0].slug}-qr.png"`, 'Cache-Control': 'private, no-store' }
  });
});
