/** GET /api/v1/staff/content-visibility —— 每篇研究文章的小程序 / 网站显示范围（ops）；修改走 POST /api/v1/staff/growth { key: 'content_visibility', value } */
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';
import { handler, ok, requireStaff } from '@/lib/crm/http';
import { researchVisibilityList, setContentVisibility, type Visibility } from '@/lib/mpContent';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  await requireStaff(req, 'ops');
  const v = await getSetting<Visibility>(getPool(), 'content_visibility', {});
  setContentVisibility(v);
  return ok({ items: researchVisibilityList(), raw: v });
});
