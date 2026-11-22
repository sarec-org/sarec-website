/** 后台综合优化 六.1：GET /api/v1/staff/events/:id/hub —— 活动页顶上的分栏数字（报名与签到 / 筹备清单 / 相册 / 回顾 / 数据）和状态（已结束不再显示进行中） */
import { eventHub } from '@/lib/crm/eventFlow';
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaffAny(req, ['ops', 'checkin']);
  return ok(await eventHub(params.id));
});
