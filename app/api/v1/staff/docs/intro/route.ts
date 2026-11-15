/** GET /api/v1/staff/docs/intro —— 现在哪一份是商会介绍；POST { slug } —— 设为商会介绍（admin，只能有一份） */
import { body, handler, ok, requireStaff } from '@/lib/crm/http';
import { introSlug, setIntroDoc } from '@/lib/docs/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => { await requireStaff(req, 'admin'); return ok({ slug: await introSlug() }); });
export const POST = handler(async (req: Request) => {
  const s = await requireStaff(req, 'admin');
  const b = await body<{ slug?: string }>(req);
  return ok(await setIntroDoc(s, String(b.slug ?? '')));
});
