/** GET /api/v1/staff/checkin/search?q=&eventId= —— 现场签到台按姓名、手机号、邮箱、会员编号查人（checkin） */
import { searchPeople } from '@/lib/crm/staff';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'checkin');
  const sp = new URL(req.url).searchParams;
  return ok({ people: await searchPeople(sp.get('q') ?? '', sp.get('eventId')) });
});
