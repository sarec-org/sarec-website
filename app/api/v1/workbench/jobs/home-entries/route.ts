/** PUT /api/v1/workbench/jobs/home-entries { entries: [1–7 个 {label, icon?, pinned?（D29 常显，不传沿用原值）, showOn?: ['find'|'work']（指令 29：在哪一侧显示，不传沿用原值）, target:{type:'trade'|'group', key}}] } —— 首页 7 个入口（顺序即数组顺序） */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { saveHomeEntries } from '@/lib/jobs/trades';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const PUT = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body<{ entries?: unknown }>(req);
  return ok({ homeEntries: await saveHomeEntries(b.entries, `staff:${s.name || s.email}`) });
});
