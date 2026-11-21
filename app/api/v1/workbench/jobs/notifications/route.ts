/** GET /api/v1/workbench/jobs/notifications?postId=&limit= —— 通知记录（发了谁、什么渠道、没发出的原因） */
import { getPool } from '@/lib/db/client';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const q = new URL(req.url).searchParams;
  const postId = q.get('postId');
  const limit = Math.min(Number(q.get('limit')) || 200, 1000);
  const { rows } = await getPool().query(
    `SELECT n.id, n.kind, n.post_id AS "postId", n.pro_id AS "proId", n.contact_id AS "contactId", c.name AS "contactName", n.round, n.channel, n.status, n.detail, n.created_at AS "createdAt"
       FROM jobs_notifications n LEFT JOIN contacts c ON c.id = n.contact_id
      WHERE ($1::uuid IS NULL OR n.post_id = $1) ORDER BY n.created_at DESC LIMIT ${limit}`,
    [postId && /^[0-9a-f-]{36}$/i.test(postId) ? postId : null]
  );
  return ok({ items: rows });
});
