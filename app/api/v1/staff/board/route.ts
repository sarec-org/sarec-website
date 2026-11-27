/**
 * 指令 95 后台「内容 › 看板」（运营）。
 * GET → { notices（显示中的在前，含已到期 / 已撤下的最近 60 条）, switches（每种自动消息的开关和现在有几条）, preview（现在首页滚的是哪几条）, events, pages }
 * POST { action:'create', text, link?, pinned?, endsOn? } / { action:'pin', id, pinned } / { action:'set_end', id, endsOn } / { action:'remove', id } / { action:'switch', kind, on }
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { staffBoard, staffBoardAction } from '@/lib/crm/board';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await staffBoard());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await staffBoardAction(s, await body(req)));
});
