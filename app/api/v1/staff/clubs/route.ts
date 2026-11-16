/** 1.5.0 后台俱乐部管理（运营）：GET 俱乐部、组局、禁止名单、操作记录；POST { action, ... } */
import { staffClubAction, staffClubs } from '@/lib/crm/clubs';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => { await requireStaff(req, 'ops'); return ok(await staffClubs()); });
export const POST = handler(async (req: Request) => ok(await staffClubAction(await requireStaff(req, 'ops'), await body(req))));
