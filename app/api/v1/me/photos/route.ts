/** GET /api/v1/me/photos —— 1.4.0「我的照片」：我在所有活动传的照片，按活动分组 */
import { listAllMyPhotos } from '@/lib/crm/customerPhotos';
import { handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => ok({ groups: await listAllMyPhotos(await requireContact(req)) }));
