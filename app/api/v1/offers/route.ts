/** GET /api/v1/offers —— 商家优惠列表（后台维护） */
import { listOffers } from '@/lib/crm/venue';
import { handler, ok } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => ok({ offers: await listOffers() }));
