/** 1.5.0 后台「内容管理」（运营）：GET ?tab=reported|machine|down；POST { kind, id, action: take_down|restore|dismiss|ban|unban, reason? } */
import { contentAction, contentBoard } from '@/lib/crm/contentAdmin';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => { await requireStaff(req, 'ops'); return ok(await contentBoard(new URL(req.url).searchParams.get('tab') ?? 'reported')); });
export const POST = handler(async (req: Request) => ok(await contentAction(await requireStaff(req, 'ops'), await body(req))));
