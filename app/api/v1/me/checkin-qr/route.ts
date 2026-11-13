/** GET /api/v1/me/checkin-qr?slug= —— 个人签到码已停用：qr 恒为 null（老客户端拿到空就不显示码），只返回报名状态 */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  const { rows } = await getPool().query<{ id: string; status: string }>(
    `SELECT r.id, r.status FROM registrations r JOIN events e ON e.id = r.event_id WHERE e.slug = $1 AND r.contact_id = $2 AND r.status <> 'cancelled'`,
    [slug, me]
  );
  if (!rows[0]) throw new CrmError('not_registered', '没有找到您这场的报名');
  return ok({ qr: null, status: rows[0].status });
});
