/**
 * 邀请现有会员来登记接活
 * GET  ?roleCategory=&roleSub= —— 按行业标签筛现有会员（带是否已登记、上次邀请时间）
 * POST { contactIds } —— 一键发邀请（同一人 30 天内只发一次；照样走发消息的保险）
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { inviteCandidates, sendInvites } from '@/lib/jobs/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const q = new URL(req.url).searchParams;
  return ok(await inviteCandidates(q.get('roleCategory'), q.get('roleSub')));
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await sendInvites(s, await body(req)));
});
