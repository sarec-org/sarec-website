/** POST /api/v1/jobs/report { targetType:'pro'|'post', targetId, reason } —— 反馈 / 投诉，直达工作人员（后台待跟进） */
import { body, handler, ok } from '@/lib/crm/http';
import { viewer } from '@/lib/jobs/access';
import { report } from '@/lib/jobs/posts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request) => ok(await report((await viewer(req)).contactId, await body(req))));
