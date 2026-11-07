/** 1.3 J 活动回顾（ops）：GET 列表；POST { eventId } 立即为这场活动生成 / 重新生成初稿（已发布的不动） */
import { buildRecap, listRecaps } from '@/lib/crm/postEvent';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ recaps: await listRecaps() });
});
export const POST = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const b = await body<{ eventId?: string }>(req);
  return ok(await buildRecap(String(b.eventId ?? ''), { force: true }));
});
