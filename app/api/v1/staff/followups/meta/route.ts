/** GET /api/v1/staff/followups/meta —— 负责人点选用的团队名单（在职），谁是会长 / 助理（ops） */
import { teamMembers } from '@/lib/crm/followupKit';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const team = await teamMembers();
  return ok({ team: team.map((m) => ({ name: m.name, president: m.president, assistant: m.assistant })), me: s.name });
});
