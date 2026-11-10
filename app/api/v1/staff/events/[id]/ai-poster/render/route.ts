/**
 * GET /api/v1/staff/events/:id/ai-poster/render?size=tall|square|oa[&gen=<候选图 id>][&inline=1]
 * 叠好字的 AI 海报：竖版 1080×1620、方版 1080×1080、公众号头图 900×383。只在后台下载（朋友圈、群、公众号用），不进小程序。
 */
import { CrmError } from '@/lib/crm/events';
import { handler, requireStaff } from '@/lib/crm/http';
import { POSTER_SIZES, type PosterSize } from '@/lib/poster/compose';
import { renderPoster } from '@/lib/poster/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NAME: Record<PosterSize, string> = { tall: '竖版1080x1620', square: '方版1080x1080', oa: '公众号头图900x383' };

export const GET = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireStaff(req, 'ops');
  const sp = new URL(req.url).searchParams;
  const size = (sp.get('size') ?? 'tall') as PosterSize;
  if (!POSTER_SIZES[size]) throw new CrmError('bad_request', '海报尺寸不对');
  const { png, slug } = await renderPoster(params.id, size, sp.get('gen'));
  const file = encodeURIComponent(`AI海报-${NAME[size]}-${slug}.png`);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      ...(sp.get('inline') ? {} : { 'Content-Disposition': `attachment; filename="ai-poster-${size}-${slug}.png"; filename*=UTF-8''${file}` })
    }
  });
});
