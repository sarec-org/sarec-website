/** POST /api/v1/events/:slug/register —— 报名（首次：name + roleSub；再次：answers 必答题）。重复提交回到原报名。 */
import { register, type RegisterInput } from '@/lib/crm/flow';
import { body, handler, ok, requireContact } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const me = await requireContact(req);
  return ok(await register(params.slug, me, await body<RegisterInput>(req)));
});
