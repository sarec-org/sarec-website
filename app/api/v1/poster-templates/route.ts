/**
 * GET /api/v1/poster-templates（不要求登录）—— 1.7.0 海报模板清单：上架的分类和模板，按 tier、sort 排；图片地址是本站 /api/v1/poster-img/…
 * 指令 83：多给 sections（祝福 → 快到的节日 → 常用活动，按洛杉矶今天算）。非正式环境可带 ?today=YYYY-MM-DD 拨日期。
 */
import { NextResponse } from 'next/server';
import { handler, siteUrl } from '@/lib/crm/http';
import { publicList } from '@/lib/org/posterTemplates';
import { requestToday } from '@/lib/org/festivals';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const data = await publicList(siteUrl(req), requestToday(req));
  return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'public, max-age=60' } });
});
