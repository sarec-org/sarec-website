/**
 * GET /api/v1/org/events/<id>/poster.png —— 1.7.0 选了模板的活动：服务器出成品海报（1080×1620 PNG）。
 * 权限和 GET …/poster 一样（登录 + 这场活动的负责人 / 帮手）。出图失败返回 500，小程序退回老海报。
 * 地址里的 ?v=<活动 updated_at 毫秒>-<模板版本> 只用来让缓存跟着内容换新。
 */
import { CrmError } from '@/lib/crm/events';
import { fail, handler, requireContact, siteUrl } from '@/lib/crm/http';
import { eventPosterPng } from '@/lib/org/posterRender';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  const me = await requireContact(req);
  let png: Buffer;
  try {
    png = await eventPosterPng(me, params.id, siteUrl(req));
  } catch (e) {
    if (e instanceof CrmError) throw e;
    console.error('[org poster.png]', e instanceof Error ? e.message : 'unknown');
    return fail('poster_failed', '海报暂时出不来，请稍后再试', 500);
  }
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Content-Length': String(png.length), 'Cache-Control': 'private, max-age=3600' } });
});
