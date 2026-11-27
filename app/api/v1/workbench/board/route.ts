/**
 * 指令 95 手机工作台（小程序「我的 → 工作台」）发看板通知：和后台 /api/v1/staff/board 同一套（运营）。
 * GET → { notices, switches, preview, events, pages }（不含金额）
 * POST 三步发完：{ action:'create', text, link?:{type:'event',id}|{type:'page',path}|{type:'web',url}, pinned?, endsOn? }；
 *      也能 { action:'pin' | 'set_end' | 'remove', id, … }。开关只在网站后台改（这里传 switch 会被拒）。
 */
import { body, handler, ok, requireStaffAny } from '@/lib/crm/http';
import { CrmError } from '@/lib/crm/events';
import { staffBoard, staffBoardAction } from '@/lib/crm/board';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** 地区管理员（只管某几个地区的）不能发全站看板 */
async function boardStaff(req: Request) {
  const s = await requireStaffAny(req, ['ops']);
  if (s.regions?.length && !s.roles.includes('admin')) throw new CrmError('forbidden', '看板是全站的，地区管理员不能发，请联系商会运营');
  return s;
}
export const GET = handler(async (req: Request) => {
  await boardStaff(req);
  return ok(await staffBoard());
});
export const POST = handler(async (req: Request) => {
  const s = await boardStaff(req);
  const b = await body(req);
  if (b.action === 'switch') throw new CrmError('bad_request', '自动消息的开关请在网站后台「内容 › 看板」里改');
  return ok(await staffBoardAction(s, b));
});
