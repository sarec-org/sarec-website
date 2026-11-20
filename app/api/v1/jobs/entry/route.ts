/**
 * GET /api/v1/jobs/entry —— D12 网站顶部菜单、网站首页的「找工人·接活」入口要不要出：{ show, find, work }（两个开关都关 show = false）。
 * 只看开关，不分工作人员 / 普通人。公开、可短时缓存。
 */
import { NextResponse } from 'next/server';
import { getSwitches } from '@/lib/jobs/settings';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  let find = false;
  let work = false;
  try {
    ({ find, work } = await getSwitches());
  } catch {
    find = work = false;
  }
  return NextResponse.json({ ok: true, show: find || work, find, work }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' } });
}
