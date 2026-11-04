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
  contentServices
} from '@/lib/mpContent';

export const runtime = 'nodejs';
export const revalidate = 300;

const json = (data: unknown, status = 200) =>
  NextResponse.json(status === 200 ? { ok: true, ...(data as object) } : { ok: false, error: { code: 'not_found', message: '内容不存在或已下线' } }, {
    status,
    headers: { 'Cache-Control': status === 200 ? 'public, s-maxage=300, stale-while-revalidate=3600' : 'no-store' }
  });

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const [a, b] = params.path ?? [];
  let data: unknown = null;
  if (a === 'home' && !b) data = contentHome();
  else if (a === 'about' && !b) data = contentAbout();
  else if (a === 'services' && !b) data = contentServices();
  else if (a === 'services' && b) data = contentService(b);
  else if (a === 'research' && !b) data = contentResearchList();
  else if (a === 'research' && b) data = contentResearch(b);
  else if (a === 'benefits' && !b) data = contentBenefits();
  else if (a === 'contact' && !b) data = contentContact();
  return data ? json(data) : json(null, 404);
}
