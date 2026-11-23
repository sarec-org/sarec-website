/** POST /api/v1/clubs/:key/meetups —— 1.5.0 发起组局（先过文本安全检测；牌类不能写输赢金额奖励） */
import { createMeetup } from '@/lib/crm/clubs';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { key: string } }) => ok(await createMeetup(await requireContact(req), decodeURIComponent(params.key), await body(req))));
