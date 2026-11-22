/** GET /api/v1/staff/perf?days=3&limit=30&model= —— 后台「真机速度」：最近会话的分阶段耗时、慢请求排行、进页面排行（只在测试站有数据） */
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { perfEnabled, perfSummary } from '@/lib/crm/perf';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaffAny(req, ['ops', 'admin']);
  if (!perfEnabled()) return ok({ enabled: false, sessions: [], reqs: [], pages: [], models: [] });
  const sp = new URL(req.url).searchParams;
  const days = Math.max(1, Math.min(30, Number(sp.get('days')) || 3));
  const limit = Math.max(1, Math.min(100, Number(sp.get('limit')) || 30));
  const model = (sp.get('model') || '').slice(0, 60);
  return ok({ enabled: true, ...(await perfSummary({ days, limit, model })) });
});
