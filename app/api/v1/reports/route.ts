/** 1.5.0 举报：GET 举报理由；POST { kind, targetId, reason, detail? } */
import { REPORT_REASONS, report } from '@/lib/crm/ugc';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => ok({ reasons: REPORT_REASONS }));
export const POST = handler(async (req: Request) => ok(await report(await requireContact(req), await body(req))));
