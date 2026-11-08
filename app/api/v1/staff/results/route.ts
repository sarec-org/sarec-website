/** GET /api/v1/staff/results —— 后台每天看的四个结果（昨天，洛杉矶时间）+ 未完成任务和异常数 */
import { getPool } from '@/lib/db/client';
import { dailyResults } from '@/lib/crm/postEvent';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const pool = getPool();
  const { rows } = await pool.query<{ todo: number; exceptions: number; cards: number; photos: number; recaps: number }>(
    `SELECT (SELECT count(*)::int FROM followups WHERE status = 'todo') AS todo,
            (SELECT count(*)::int FROM ops_exceptions WHERE status = 'open') AS exceptions,
            (SELECT count(*)::int FROM member_cards WHERE hidden_at IS NULL AND content_updated_at IS NOT NULL AND (reviewed_at IS NULL OR reviewed_at < content_updated_at)) AS cards,
            (SELECT count(*)::int FROM event_photos WHERE review_status = 'review' AND visibility = 'album' AND variant_of IS NULL AND NOT is_hidden) AS photos,
            (SELECT count(*)::int FROM event_recaps WHERE status = 'drafted') AS recaps`
  );
  return ok({ yesterday: await dailyResults(), pending: rows[0] });
});
