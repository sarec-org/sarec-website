/** POST /api/v1/events/:slug/photo-consent { consent: boolean } —— 同意 / 不同意现场照片用于商会宣传（默认不同意） */
import { body, handler, ok, requireContact } from '@/lib/crm/http';
import { setPhotoConsent } from '@/lib/crm/photos';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const b = await body<{ consent?: boolean }>(req);
  return ok(await setPhotoConsent(me, params.slug, b.consent === true));
});
