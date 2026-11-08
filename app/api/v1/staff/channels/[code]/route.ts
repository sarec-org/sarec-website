/** GET /api/v1/staff/channels/:code?slug= —— 渠道小程序码 PNG（有 slug 进那场活动，没有进首页） */
import { channelCodePng } from '@/lib/crm/channels';
import { handler, requireStaff } from '@/lib/crm/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req: Request, { params }: { params: { code: string } }) => {
  await requireStaff(req, 'ops');
  const slug = new URL(req.url).searchParams.get('slug');
  const png = await channelCodePng(params.code, slug && /^[A-Za-z0-9\-_]{1,80}$/.test(slug) ? slug : null);
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="channel-${params.code}${slug ? '-' + slug : ''}.png"` }
  });
});
