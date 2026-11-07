/** 1.3 客户照片审核（ops）：GET ?filter=review|album|all；POST { id, action: approve|reject|hide } */
import { listPhotosForReview, reviewPhoto } from '@/lib/crm/customerPhotos';
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  return ok(await listPhotosForReview(new URL(req.url).searchParams.get('filter')));
});
export const POST = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const b = await body<{ id?: string; action?: string }>(req);
  return ok(await reviewPhoto(String(b.id ?? ''), String(b.action ?? '')));
});
