/** GET /api/v1/staff/contacts?q=&region=&roleCategory=&topic=&tag=&member=member|registered&view=customers|opened|all&newDays=7|30|90&format=csv（默认按最近有动作排序；不含“只打开过、未登记”） —— 客户查询与导出（ops） */
import { contactCounts, exportContactsCsv, searchContacts, type ContactFilter } from '@/lib/crm/staff';
import { handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  const m = sp.get('member');
  const f: ContactFilter = {
    q: sp.get('q'), region: sp.get('region'), roleCategory: sp.get('roleCategory'), topic: sp.get('topic'), tag: sp.get('tag'),
    member: m === 'member' || m === 'registered' ? m : null,
    emailStatus: (['confirmed', 'unconfirmed', 'invalid', 'none'] as const).find((x) => x === sp.get('emailStatus')) ?? null,
    view: (['customers', 'opened', 'all'] as const).find((x) => x === sp.get('view')) ?? null,
    newDays: [7, 30, 90].includes(Number(sp.get('newDays'))) ? Number(sp.get('newDays')) : null
  };
  if (sp.get('format') === 'csv') {
    const csv = await exportContactsCsv(s, f);
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="sarec-contacts-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' }
    });
  }
  return ok({ contacts: await searchContacts(f), counts: await contactCounts() });
});
