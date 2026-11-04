/** GET /api/v1/staff/events/:id/wxacode[?kind=checkin] —— 活动报名 / 现场签到小程序码（正式版，PNG 下载；ops/checkin） */
import { getPool } from '@/lib/db/client';
import { staffCan, staffFor } from '@/lib/crm/auth';
import { CrmError } from '@/lib/crm/events';
import { handler, requireContact } from '@/lib/crm/http';
import { eventCheckinCode, eventRegisterCode } from '@/lib/crm/wechat';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const s = await staffFor(await requireContact(req));
  if (!staffCan(s, 'ops') && !staffCan(s, 'checkin')) throw new CrmError('forbidden', '您没有这个操作的权限，请联系管理员开通');
  const { rows } = await getPool().query<{ slug: string; checkin_secret: string }>(`SELECT slug, checkin_secret FROM events WHERE id = $1`, [params.id]);
  if (!rows[0]) throw new CrmError('not_found', '找不到这场活动');
  const checkin = new URL(req.url).searchParams.get('kind') === 'checkin';
  const png = checkin ? await eventCheckinCode(rows[0].slug, rows[0].checkin_secret) : await eventRegisterCode(rows[0].slug);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${checkin ? 'checkin' : 'wxacode'}-${rows[0].slug}.png"`
    }
  });
});
