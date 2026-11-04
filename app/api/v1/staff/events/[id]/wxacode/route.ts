/** GET /api/v1/staff/events/:id/wxacode —— 活动报名小程序码（正式版，PNG 下载；ops/checkin） */
import { getPool } from '@/lib/db/client';
import { staffCan, staffFor } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { handler, requireContact } from '@/lib/crm/http';
import { eventRegisterCode } from '@/lib/crm/wechat';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await staffFor(await requireContact(req));
  if (!staffCan(s, 'ops') && !staffCan(s, 'checkin')) throw new CrmError('forbidden', '您没有这个操作的权限，请联系管理员开通');
  const { rows } = await getPool().query<{ slug: string }>(`SELECT slug FROM events WHERE id = $1`, [params.id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  const png = await eventRegisterCode(rows[0].slug);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="wxacode-${rows[0].slug}.png"`
    }
  });
});
