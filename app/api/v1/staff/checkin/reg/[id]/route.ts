/** GET /api/v1/staff/checkin/reg/:id —— 个人签到码：工作人员扫码后定位到这条报名（checkin） */
import { getPool } from '@/lib/db/client';
import { CrmError } from '@/lib/crm/events';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { findRoleSub } from '@/lib/crm/questionBank';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'checkin');
  if (!/^[0-9a-f-]{36}$/.test(params.id)) throw new CrmError('not_found', '签到码无效');
  const { rows } = await getPool().query(
    `SELECT r.id, r.status, r.arrival_status, e.id AS event_id, e.title, e.starts_at, e.event_status, e.fee_cents,
            c.id AS contact_id, c.member_no::int AS member_no, c.name, c.email, c.phone_e164, c.role_sub
       FROM registrations r JOIN events e ON e.id = r.event_id JOIN contacts c ON c.id = r.contact_id WHERE r.id = $1`,
    [params.id]
  );
  if (!rows[0]) throw new CrmError('not_found', '签到码无效或报名已删除');
  const r = rows[0];
  return ok({ registration: { ...r, role_label: findRoleSub(r.role_sub)?.label ?? null } });
});
