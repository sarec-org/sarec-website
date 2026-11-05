/** GET /api/v1/me/referrals —— 我的推荐：已邀请 / 已到场 / 已入会（只给数字，不显示被邀请人信息；不含任何奖励规则） */
import { getPool } from '@/lib/db/client';
import { myReferralStats } from '@/lib/crm/growth';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const me = await requireContact(req);
  const pool = getPool();
  const { rows } = await pool.query<{ member_no: number }>(`SELECT member_no::int AS member_no FROM contacts WHERE id = $1`, [me]);
  return ok({ ...(await myReferralStats(pool, me)), refCode: rows[0]?.member_no ?? null });
});
