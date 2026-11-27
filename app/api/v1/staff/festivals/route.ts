/**
 * 指令 83 后台「节日日期表」。GET → { today, festivals（含全部日期、下一次日期、今天是否在祝福窗口）, categories（给下拉选） }
 * POST { action:'save', key, name, kind, showBeforeDays, showUntilOffset, categoryKey, greetCategoryKey, sort, active, create? }
 *      { action:'add_date' | 'del_date', key, date:'YYYY-MM-DD' }
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { staffFestivalAction, staffFestivals } from '@/lib/org/festivals';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await staffFestivals());
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok(await staffFestivalAction(s, await body(req)));
});
