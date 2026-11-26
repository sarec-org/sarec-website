/** GET /api/v1/greetings（不要求登录）—— 1.7.0 节日祝福图清单：上架的祝福分类和模板，离今天（洛杉矶时间）最近、还没过的节日排前面（日期从节日表算）；图片走本站 /api/v1/poster-img/…；非正式环境可带 ?today=YYYY-MM-DD */
import { NextResponse } from 'next/server';
import { handler, siteUrl } from '@/lib/crm/http';
import { greetingList } from '@/lib/org/greetings';
import { requestToday } from '@/lib/org/festivals';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const data = await greetingList(siteUrl(req), requestToday(req));
  return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'public, max-age=60' } });
});
