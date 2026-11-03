/** GET /api/v1/rooms?from=ISO&days=7 —— 会议室、已占用时段（不含他人姓名）、本人价格、月卡 */
import { roomsOverview } from '@/lib/crm/venue';
import { handler, ok, optionalContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  return ok(await roomsOverview(await optionalContact(req), sp.get('from') ?? new Date().toISOString(), Number(sp.get('days') ?? 7)));
});
