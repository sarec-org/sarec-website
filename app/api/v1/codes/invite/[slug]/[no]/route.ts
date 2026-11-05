/** GET /api/v1/codes/invite/:slug/:memberNo.png —— 邀请海报专属小程序码（scene 带推荐码） */
import { inviteCodePng } from '@/lib/crm/cards';
import { CrmError } from '@/lib/crm/events';
import { handler } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (_req: Request, { params }: { params: { slug: string; no: string } }) => {
  const no = Number(String(params.no).replace(/\.png$/, ''));
  if (!Number.isInteger(no) || no <= 0) throw new CrmError('not_found', '链接有误');
  const png = await inviteCodePng(decodeURIComponent(params.slug), no);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } });
});
