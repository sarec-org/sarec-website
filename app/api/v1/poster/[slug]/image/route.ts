/**
 * GET /api/v1/poster/:slug/image —— 1.3.3 邀请海报成品图（服务器出图，JPEG 1080×1620）。
 * 小程序用 wx.downloadFile 带登录头取图；活动没设官方海报返回 404（code no_official），小程序退回原样式。
 */
import { handler, requireContact } from '@/lib/crm/http';
import { invitePosterImage } from '@/lib/crm/invitePoster';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = handler(async (req: Request, { params }: { params: { slug: string } }) => {
  const id = await requireContact(req);
  const { jpg, version, cached } = await invitePosterImage(id, decodeURIComponent(params.slug));
  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300', 'X-Poster-Version': version, 'X-Poster-Cached': cached ? '1' : '0' } });
});
