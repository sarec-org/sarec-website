/** GET /api/v1/staff/cards?filter=pending|hidden|all&q= —— 名片审核列表；POST { contactId, action: approve|hide|restore|clear_avatar, reason } */
import { listCardsForReview, reviewCard } from '@/lib/crm/cardReview';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  return ok(await listCardsForReview(sp.get('filter'), sp.get('q')));
});

export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'ops');
  const b = await body(req);
  return ok(await reviewCard(s, String(b.contactId ?? ''), String(b.action ?? ''), b.reason));
});
