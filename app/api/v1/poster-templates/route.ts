/** GET /api/v1/poster-templates（不要求登录）—— 1.7.0 海报模板清单：上架的分类和模板，按 tier、sort 排；图片地址是本站 /api/v1/poster-img/… */
import { NextResponse } from 'next/server';
import { handler, siteUrl } from '@/lib/crm/http';
import { publicList } from '@/lib/org/posterTemplates';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const data = await publicList(siteUrl(req));
  return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'public, max-age=60' } });
});
