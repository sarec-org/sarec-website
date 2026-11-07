/** GET /api/v1/events/:slug/roster —— 本场电子名册（只给本场到场的人看） */
import { rosterForParticipant } from '@/lib/crm/roster';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) =>
  ok(await rosterForParticipant(decodeURIComponent(params.slug), await requireContact(req)))
);
