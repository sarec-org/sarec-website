/** GET /api/v1/staff/off-features —— 「设置与团队」最上面“现在关着的功能”（只读，只列出不打开） */
import { handler, ok, requireStaffAny } from '@/lib/crm/http';
import { offFeatures } from '@/lib/crm/offFeatures';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaffAny(req, ['ops', 'checkin', 'finance', 'admin']);
  return ok({ items: await offFeatures() });
});
