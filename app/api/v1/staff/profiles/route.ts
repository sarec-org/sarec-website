/** 1.5.0 后台主页审核（运营）：GET ?filter=pending|all|taken_down；POST { action, id, reason? } */
import { staffProfileAction, staffProfiles } from '@/lib/crm/ugc';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => { await requireStaff(req, 'ops'); return ok(await staffProfiles(new URL(req.url).searchParams.get('filter') ?? 'pending')); });
export const POST = handler(async (req: Request) => ok(await staffProfileAction(await requireStaff(req, 'ops'), await body(req))));
