/** GET 门口签到码 PNG（只给这场活动的负责人 / 帮手） */
import { handler, requireContact } from '@/lib/crm/http';
import { getPool } from '@/lib/db/client';
import { codePng, eventAccess } from '@/lib/org/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireContact(req);
  const { ev } = await eventAccess(getPool(), me, params.id, 'helper');
  const png = await codePng(ev.code, 'door', me);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
});
