/**
 * GET /api/v1/staff/moderation —— 「举报与下架」汇总（指令 89-B 验收 P2-4，运营）。
 * 后台的举报 / 下架分在好几页（内容管理、内容审核、找工人接活儿投诉、主办方、俱乐部组局、相册、海报模板），这里只数每处各有几条要处理，
 * 页面上一行一处、点进各自的页面去办。只读，不改任何数据；某一处数不出来就给 null（页面写"读不到"），不影响其他几处。
 */
import { getPool } from '@/lib/db/client';
import { contentBoard } from '@/lib/crm/contentAdmin';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const n = async (sql: string): Promise<number | null> => {
  try {
    const { rows } = await getPool().query<{ n: number }>(sql);
    return rows[0]?.n ?? 0;
  } catch {
    return null;
  }
};

export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const board = async (t: string) => { try { return (await contentBoard(t)).items.length; } catch { return null; } };
  const [reported, machine, down, cards, cardsHidden, jobs, orgReview, orgDown, meetups, photos, templatesOff] = await Promise.all([
    n(`SELECT count(DISTINCT (kind, target_id))::int AS n FROM ugc_reports WHERE status = 'open'`),
    board('machine'),
    board('down'),
    n(`SELECT count(*)::int AS n FROM member_cards m WHERE m.hidden_at IS NULL AND m.content_updated_at IS NOT NULL AND (m.reviewed_at IS NULL OR m.reviewed_at < m.content_updated_at)`),
    n(`SELECT count(*)::int AS n FROM member_cards WHERE hidden_at IS NOT NULL`),
    n(`SELECT count(*)::int AS n FROM jobs_reports WHERE status = 'open'`),
    n(`SELECT count(*)::int AS n FROM org_events WHERE status = 'review'`),
    n(`SELECT count(*)::int AS n FROM org_events WHERE status = 'taken_down'`),
    n(`SELECT count(*)::int AS n FROM club_meetups WHERE sec_status = 'pending' AND status = 'open'`),
    n(`SELECT count(*)::int AS n FROM event_photos WHERE review_status = 'review' AND visibility = 'album' AND variant_of IS NULL AND NOT is_hidden`),
    n(`SELECT count(*)::int AS n FROM poster_templates WHERE status <> 'active'`)
  ]);
  return ok({ reported, machine, down, cards, cardsHidden, jobs, orgReview, orgDown, meetups, photos, templatesOff });
});
