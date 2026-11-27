/**
 * GET /api/v1/board（不用登录）—— 指令 95 首页「商会看板」：
 * { ok, ticker:[{id,kind,icon,color,text,link,time}]（最多 8 条，置顶在前）, pinned:[…+sub,endsAt], days:[{date,label:'今天'|'昨天'|'11/24',items}]（最近 14 天）, version, today }
 * link：小程序页面路径字符串（navigateTo）/ { web: 网址 } / null。文字全由服务器拼（见 lib/crm/board.ts）。
 * 不分人：本实例缓存 30 秒 + CDN 30 秒。非正式环境可带 ?today=YYYY-MM-DD（只影响节日祝福那一种）。
 */
import { NextResponse } from 'next/server';
import { handler } from '@/lib/crm/http';
import { boardCached } from '@/lib/crm/board';
import { laToday, requestToday } from '@/lib/org/festivals';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request) => {
  const t = requestToday(req);
  const data = await boardCached(t === laToday() ? undefined : t);
  return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60' } });
});
