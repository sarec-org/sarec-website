/**
 * GET /api/v1/poster-img/<模板 id>/<版本>/<t.jpg | l.jpg> —— 1.7.0 模板图（小图 / 大图），从 Blob 取出原样返回。
 * 小程序只能下载本站域名的图，所以不直接给 Blob 地址。地址带版本号：版本对得上就长期缓存；对不上（换过图）给现在的图、只缓存 1 分钟。
 */
import { fail } from '@/lib/crm/http';
import { fetchTemplateImage, getTemplate } from '@/lib/org/posterTemplates';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type P = { params: { id: string; ver: string; size: string } };
export async function GET(_req: Request, { params }: P) {
  const size = params.size === 't.jpg' ? 't' : params.size === 'l.jpg' ? 'l' : null;
  if (!size) return fail('not_found', '找不到这张图', 404);
  try {
    const t = await getTemplate(params.id);
    if (!t) return fail('not_found', '找不到这张图', 404);
    const buf = await fetchTemplateImage(t, size);
    const same = String(t.version) === params.ver;
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(buf.length),
        'Cache-Control': same ? 'public, max-age=31536000, s-maxage=31536000, immutable' : 'public, max-age=60'
      }
    });
  } catch (e) {
    console.error('[poster-img]', e instanceof Error ? e.message : 'unknown');
    return fail('server_error', '图片暂时取不到，请稍后再试', 500);
  }
}
