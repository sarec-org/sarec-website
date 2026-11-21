/** GET /api/v1/jobs/meta —— 找工人 · 接活儿：开关、分组、工种、首页 7 个入口、我的接活状态、最新 3 条活儿（小程序给空数组） */
import { handler, ok } from '@/lib/crm/http';
import { viewer } from '@/lib/jobs/access';
import { buildMeta } from '@/lib/jobs/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok(await buildMeta(await viewer(req))));
