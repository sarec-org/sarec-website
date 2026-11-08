/** 1.3 带一位朋友
 *  GET    /api/v1/events/:slug/companions —— 我带的朋友 + 每人最多几位
 *  POST   /api/v1/events/:slug/companions { name, phone, cc? } —— 替朋友报名（单独占名额、单独签到）
 *  DELETE /api/v1/events/:slug/companions?id=<报名 id> —— 朋友不来了（没签到的才能取消）
 */
import { addCompanion, listCompanions, removeCompanion } from '@/lib/crm/companions';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) =>
  ok(await listCompanions(decodeURIComponent(params.slug), await requireContact(req)))
);
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const slug = decodeURIComponent(params.slug);
  const r = await addCompanion(slug, me, await body(req));
  return ok({ ...r, ...(await listCompanions(slug, me)) });
});
export const DELETE = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  const slug = decodeURIComponent(params.slug);
  await removeCompanion(slug, me, String(new URL(req.url).searchParams.get('id') ?? ''));
  return ok(await listCompanions(slug, me));
});
