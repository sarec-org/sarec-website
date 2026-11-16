/** 1.5.0 后台举报（运营）：GET ?status=open|done|dismissed|all；POST { id, status: done|dismissed, note? } */
import { handleReport, staffReports } from '@/lib/crm/ugc';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => { await requireStaff(req, 'ops'); return ok(await staffReports(new URL(req.url).searchParams.get('status') ?? 'open')); });
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ id?: string; status?: string; note?: string }>(req);
  return ok(await handleReport(s, String(b.id ?? ''), b.status === 'dismissed' ? 'dismissed' : 'done', b.note ?? null));
});
