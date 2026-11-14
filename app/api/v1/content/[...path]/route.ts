/**
 * GET /api/v1/content/{home|about|services|services/:slug|research|research/:slug|benefits|contact}
 * 小程序只读内容：与网站同源（Keystatic 文章 + 页面文案），只读、公开、可缓存。合规过滤见 lib/mpContent.ts。
 */
import { NextResponse } from 'next/server';
import {
  contentAbout,
  contentBenefits,
  contentContact,
  contentHome,
  contentResearch,
  contentResearchList,
  contentService,
  contentServices,
  scrubMp,
  setContentVisibility,
  type Visibility,
  SAREC_OFFICE_ADDRESS
} from '@/lib/mpContent';
import { geocode } from '@/lib/crm/geo';
import { getPool } from '@/lib/db/client';
import { getSetting } from '@/lib/crm/orders';

/** 内容显示范围（后台可改）；数据库不可用时按默认规则 */
async function loadVisibility() {
  try {
    setContentVisibility(await getSetting<Visibility>(getPool(), 'content_visibility', {}));
  } catch {
    setContentVisibility({});
  }
}

export const runtime = 'nodejs';
export const revalidate = 300;

const json = (data: unknown, status = 200) =>
  NextResponse.json(status === 200 ? { ok: true, ...(data as object) } : { ok: false, error: { code: 'not_found', message: '内容不存在或已下线' } }, {
    status,
    headers: { 'Cache-Control': status === 200 ? 'public, s-maxage=300, stale-while-revalidate=3600' : 'no-store' }
  });

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const [a, b] = params.path ?? [];
  if (a === 'research') await loadVisibility();
  let data: unknown = null;
  if (a === 'home' && !b) data = contentHome();
  else if (a === 'about' && !b) data = contentAbout();
  else if (a === 'services' && !b) data = contentServices();
  else if (a === 'services' && b) data = contentService(b);
  else if (a === 'research' && !b) data = contentResearchList();
  else if (a === 'research' && b) data = contentResearch(b);
  else if (a === 'benefits' && !b) data = contentBenefits();
  else if (a === 'contact' && !b) data = { ...contentContact(), geo: await geocode(SAREC_OFFICE_ADDRESS) };
  return data ? json(scrubMp(data)) : json(null, 404);
}
