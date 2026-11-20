/**
 * 工种与资质表（后台可增删改，不用发版）
 * GET  —— { groups, trades（全字段）, homeEntries }
 * POST —— 新增或修改一个工种 { key, name, group, licType, issuer?, licenseClass?, lookupUrl?, verifyPoints?, open?, noPost?, noNotify?, sort?, verified?, note?, icon? }
 */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { loadGroups, loadHomeEntries, loadTrades, upsertTrade } from '@/lib/jobs/trades';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok({ groups: await loadGroups(), trades: await loadTrades(), homeEntries: await loadHomeEntries() });
});
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  return ok({ trade: await upsertTrade(await body(req), `staff:${s.name || s.email}`) });
});
