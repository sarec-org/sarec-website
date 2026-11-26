/** GET /api/v1/greetings（不要求登录）—— 1.7.0 节日祝福图清单：上架的祝福分类和模板，离今天（洛杉矶时间）最近、还没过的节日排前面；图片走本站 /api/v1/poster-img/… */
import { NextResponse } from 'next/server';
import { handler, siteUrl } from '@/lib/crm/http';
import { greetingList } from '@/lib/org/greetings';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const data = await greetingList(siteUrl(req));
  return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'public, max-age=60' } });
});
